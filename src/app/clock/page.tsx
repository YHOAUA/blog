'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { Play, Pause, RotateCcw, SkipForward, Settings } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak'

interface PomodoroConfig {
	focus: number
	shortBreak: number
	longBreak: number
	longBreakEvery: number
}

// 七段数码管的段路径，下标严格对应几何位置：0 顶 / 1 右上 / 2 右下 / 3 底 / 4 左下 / 5 左上 / 6 中
const SEGMENT_PATHS = [
	'M4.20248 3.49482C2.82797 2.27303 3.69218 0 5.53121 0H22.6867C24.5522 0 25.4019 2.32821 23.975 3.52982L23.5791 3.86316C23.2186 4.16681 22.7623 4.33333 22.2909 4.33333H5.90621C5.41638 4.33333 4.94359 4.15358 4.57748 3.82815L4.20248 3.49482Z',
	'M24.8497 4.25654C26.1428 3.12502 28.1667 4.04338 28.1667 5.76169L28.1667 21.8498C28.1667 23.4207 26.4388 24.3784 25.1067 23.5458L24.7734 23.3375C24.1886 22.972 23.8334 22.3311 23.8334 21.6415L23.8334 6.05336C23.8334 5.47663 24.0823 4.92798 24.5163 4.54821L24.8497 4.25654Z',
	'M25.1862 28.489C26.5194 27.7391 28.1667 28.7025 28.1667 30.2322L28.1667 46.6299C28.1667 48.4117 26.0124 49.3041 24.7525 48.0441L24.4191 47.7108C24.0441 47.3357 23.8334 46.827 23.8334 46.2966L23.8334 30.4197C23.8334 29.6971 24.2231 29.0308 24.8528 28.6765L25.1862 28.489Z',
	'M23.9259 48.6321C25.1234 49.9094 24.2177 52 22.4669 52L5.69978 52C3.9489 52 3.04321 49.9094 4.24071 48.6321L4.55321 48.2988C4.9313 47.8955 5.45947 47.6667 6.01228 47.6667L22.1544 47.6667C22.7072 47.6667 23.2353 47.8955 23.6134 48.2988L23.9259 48.6321Z',
	'M3.4564 47.7859C2.21509 49.1048 4.23823e-07 48.2263 6.6133e-07 46.4152L2.79423e-06 30.1501C3.00022e-06 28.5793 1.72791 27.6216 3.06 28.4541L3.39333 28.6625C3.9781 29.028 4.33334 29.6689 4.33334 30.3585L4.33333 46.061C4.33333 46.5705 4.13891 47.0607 3.78973 47.4317L3.4564 47.7859Z',
	'M3.06 23.5458C1.7279 24.3784 -8.31295e-08 23.4207 -1.47217e-07 21.8498L-8.06095e-07 5.69981C-8.77526e-07 3.94893 2.09055 3.04323 3.36788 4.24073L3.70121 4.55323C4.10452 4.93133 4.33333 5.45949 4.33333 6.01231L4.33333 21.6415C4.33333 22.3311 3.97809 22.972 3.39333 23.3375L3.06 23.5458Z',
	'M3.85122 24.13C4.16644 23.936 4.5293 23.8333 4.89942 23.8333H23.3022C23.6503 23.8333 23.9923 23.9242 24.2945 24.0969L24.5862 24.2635C25.9298 25.0313 25.9298 26.9687 24.5862 27.7365L24.2945 27.9032C23.9923 28.0758 23.6503 28.1667 23.3022 28.1667H4.89942C4.5293 28.1667 4.16644 28.064 3.85122 27.87L3.58039 27.7033C2.31131 26.9224 2.31132 25.0777 3.58039 24.2967L3.85122 24.13Z',
]

// 各数字点亮的段（下标语义同 SEGMENT_PATHS）。8 全亮作为完整性校验基准
const SEGMENT_MAP: Record<number, boolean[]> = {
	0: [true, true, true, true, true, true, false],
	1: [false, true, true, false, false, false, false],
	2: [true, true, false, true, true, false, true],
	3: [true, true, true, true, false, false, true],
	4: [false, true, true, false, false, true, true],
	5: [true, false, true, true, false, true, true],
	6: [true, false, true, true, true, true, true],
	7: [true, true, true, false, false, false, false],
	8: [true, true, true, true, true, true, true],
	9: [true, true, true, true, false, true, true],
}

// dev 下断言：段路径与段图都恰好 7 段，避免碎字符 / 漏段静默漏到运行时
if (process.env.NODE_ENV !== 'production') {
	if (SEGMENT_PATHS.length !== 7 || SEGMENT_PATHS.some(p => !p)) {
		throw new Error('SEGMENT_PATHS 必须恰好 7 段且非空')
	}
	SEGMENT_MAP[8].forEach((on, i) => {
		if (!on) throw new Error(`数字 8 的第 ${i} 段应为亮`)
	})
}

const DEFAULT_CONFIG: PomodoroConfig = { focus: 25, shortBreak: 5, longBreak: 15, longBreakEvery: 4 }

function loadConfig(): PomodoroConfig {
	if (typeof window === 'undefined') return DEFAULT_CONFIG
	try {
		const raw = localStorage.getItem('pomodoro:config')
		return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG
	} catch {
		return DEFAULT_CONFIG
	}
}

function saveConfig(config: PomodoroConfig) {
	localStorage.setItem('pomodoro:config', JSON.stringify(config))
}

function getTodayKey() {
	return `pomodoro:today:${dayjs().format('YYYY-MM-DD')}`
}

function loadTodayCount(): number {
	if (typeof window === 'undefined') return 0
	return parseInt(localStorage.getItem(getTodayKey()) || '0', 10)
}

function saveTodayCount(count: number) {
	localStorage.setItem(getTodayKey(), String(count))
}

function playBeep() {
	try {
		const ctx = new AudioContext()
		const osc = ctx.createOscillator()
		const gain = ctx.createGain()
		osc.connect(gain)
		gain.connect(ctx.destination)
		osc.frequency.value = 880
		gain.gain.value = 0.3
		osc.start()
		osc.stop(ctx.currentTime + 0.15)
		setTimeout(() => {
			const osc2 = ctx.createOscillator()
			const gain2 = ctx.createGain()
			osc2.connect(gain2)
			gain2.connect(ctx.destination)
			osc2.frequency.value = 1100
			gain2.gain.value = 0.3
			osc2.start()
			osc2.stop(ctx.currentTime + 0.15)
		}, 200)
	} catch {}
}

export default function ClockPage() {
	const [isRunning, setIsRunning] = useState(false)
	const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('focus')
	const [pomodoroTime, setPomodoroTime] = useState(0)
	const [pomodoroConfig, setPomodoroConfig] = useState<PomodoroConfig>(DEFAULT_CONFIG)
	const [focusRound, setFocusRound] = useState(0)
	const [completedToday, setCompletedToday] = useState(0)
	const [showSettings, setShowSettings] = useState(false)
	const [pomodoroStarted, setPomodoroStarted] = useState(false)

	const intervalRef = useRef<number | null>(null)
	const startTimeRef = useRef<number | null>(null)
	const pomodoroTimeRef = useRef<number>(0)
	const pomodoroInitialRef = useRef<number>(0)

	pomodoroTimeRef.current = pomodoroTime

	useEffect(() => {
		setPomodoroConfig(loadConfig())
		setCompletedToday(loadTodayCount())
	}, [])

	const handlePomodoroComplete = useCallback(() => {
		playBeep()
		if (pomodoroPhase === 'focus') {
			const newRound = focusRound + 1
			setFocusRound(newRound)
			const newToday = completedToday + 1
			setCompletedToday(newToday)
			saveTodayCount(newToday)
			toast.success(`专注完成！第 ${newRound} 个番茄`)
		} else {
			toast('休息结束，准备下一轮专注')
		}
		setIsRunning(false)
		startTimeRef.current = null
		setPomodoroStarted(false)
	}, [pomodoroPhase, focusRound, completedToday])

	useEffect(() => {
		if (isRunning) {
			const now = performance.now()
			if (startTimeRef.current === null) {
				startTimeRef.current = now
				pomodoroInitialRef.current = pomodoroTimeRef.current
			} else {
				startTimeRef.current = now - (pomodoroInitialRef.current - pomodoroTimeRef.current)
			}

			const updateTime = () => {
				const currentTime = performance.now()
				const elapsed = currentTime - startTimeRef.current!
				const remaining = pomodoroInitialRef.current - elapsed

				if (remaining <= 0) {
					setPomodoroTime(0)
					handlePomodoroComplete()
					return
				}
				setPomodoroTime(Math.floor(remaining))
				intervalRef.current = requestAnimationFrame(updateTime)
			}

			intervalRef.current = requestAnimationFrame(updateTime)
		} else {
			if (intervalRef.current !== null) {
				cancelAnimationFrame(intervalRef.current)
				intervalRef.current = null
			}
		}

		return () => {
			if (intervalRef.current !== null) {
				cancelAnimationFrame(intervalRef.current)
			}
		}
	}, [isRunning, handlePomodoroComplete])

	const handleStartPause = () => {
		if (!pomodoroStarted) {
			const minutes =
				pomodoroPhase === 'focus' ? pomodoroConfig.focus : pomodoroPhase === 'shortBreak' ? pomodoroConfig.shortBreak : pomodoroConfig.longBreak
			const ms = minutes * 60000
			setPomodoroTime(ms)
			pomodoroInitialRef.current = ms
			setPomodoroStarted(true)
		}
		if (!isRunning) {
			startTimeRef.current = null
		}
		setIsRunning(prev => !prev)
	}

	const handleReset = () => {
		setIsRunning(false)
		startTimeRef.current = null
		setPomodoroTime(0)
		setPomodoroStarted(false)
		setPomodoroPhase('focus')
		setFocusRound(0)
	}

	const handleSkipPhase = () => {
		setIsRunning(false)
		startTimeRef.current = null
		setPomodoroStarted(false)
		advancePhase()
	}

	const advancePhase = () => {
		if (pomodoroPhase === 'focus') {
			if (focusRound > 0 && focusRound % pomodoroConfig.longBreakEvery === 0) {
				setPomodoroPhase('longBreak')
			} else {
				setPomodoroPhase('shortBreak')
			}
		} else {
			setPomodoroPhase('focus')
		}
		setPomodoroTime(0)
	}

	const handleNextPhase = () => {
		if (pomodoroPhase === 'focus') {
			if (focusRound > 0 && focusRound % pomodoroConfig.longBreakEvery === 0) {
				setPomodoroPhase('longBreak')
			} else {
				setPomodoroPhase('shortBreak')
			}
		} else {
			setPomodoroPhase('focus')
		}
		setPomodoroTime(0)
		setPomodoroStarted(false)
	}

	const handleConfigChange = (key: keyof PomodoroConfig, value: number) => {
		const newConfig = { ...pomodoroConfig, [key]: value }
		setPomodoroConfig(newConfig)
		saveConfig(newConfig)
	}

	const phaseLabel = pomodoroPhase === 'focus' ? '专注' : pomodoroPhase === 'shortBreak' ? '短休' : '长休'
	const phaseColor = pomodoroPhase === 'focus' ? 'text-brand' : pomodoroPhase === 'shortBreak' ? 'text-brand-secondary' : 'text-secondary'

	return (
		<div className='flex flex-col items-center px-6 pt-32 pb-12'>
			<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className='w-full max-w-[600px] space-y-8'>
				{/* Display */}
				<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className='card relative p-4'>
					<div className='mb-3 flex items-center justify-between px-2'>
						<span className={cn('text-sm font-semibold', phaseColor)}>{phaseLabel}</span>
						<span className='text-secondary text-xs'>
							第 {focusRound + (pomodoroPhase === 'focus' && pomodoroStarted ? 1 : 0)} 个 · 今日 {completedToday}
						</span>
					</div>
					<div className='bg-secondary/20 flex items-center justify-center rounded-4xl p-8'>
						<TimeDisplay time={pomodoroTime} />
					</div>
				</motion.div>

				{/* Pomodoro Settings */}
				{showSettings && !isRunning && (
					<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className='card relative space-y-4 p-4'>
						<div className='grid grid-cols-2 gap-4'>
							{(
								[
									['focus', '专注', 1, 90],
									['shortBreak', '短休', 1, 30],
									['longBreak', '长休', 1, 60],
									['longBreakEvery', '长休间隔', 2, 10],
								] as [keyof PomodoroConfig, string, number, number][]
							).map(([key, label, min, max]) => (
								<div key={key} className='flex flex-col gap-1'>
									<label className='text-secondary text-xs'>
										{label}（{key === 'longBreakEvery' ? '轮' : '分钟'}）
									</label>
									<input
										type='number'
										min={min}
										max={max}
										value={pomodoroConfig[key]}
										onChange={e => handleConfigChange(key, Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
										className='no-spinner w-full rounded-xl border bg-white/60 px-3 py-2 text-center text-lg font-bold backdrop-blur-sm focus:bg-white/80'
									/>
								</div>
							))}
						</div>
					</motion.div>
				)}

				{/* Pomodoro phase complete prompt */}
				{!isRunning && pomodoroTime === 0 && focusRound > 0 && !pomodoroStarted && (
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='flex justify-center'>
						<motion.button
							whileHover={{ scale: 1.03 }}
							whileTap={{ scale: 0.97 }}
							onClick={handleNextPhase}
							className={cn(
								'rounded-xl px-6 py-3 text-sm font-medium text-white shadow-sm',
								'bg-brand'
							)}>
							{pomodoroPhase === 'focus' ? '开始休息' : '开始专注'}
						</motion.button>
					</motion.div>
				)}

				{/* Control Buttons */}
				<div className='flex items-center justify-center gap-4'>
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => setShowSettings(s => !s)}
						className='flex h-16 w-16 items-center justify-center rounded-full border bg-white/60 backdrop-blur-sm transition-all hover:bg-white/80'>
						<Settings className='h-5 w-5' />
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleStartPause}
						className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-all ${
							isRunning ? 'bg-brand-secondary hover:bg-brand-secondary/80' : 'bg-brand hover:bg-brand/80'
						}`}>
						{isRunning ? <Pause className='h-8 w-8' /> : <Play className='h-8 w-8' />}
					</motion.button>
					{pomodoroStarted && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleSkipPhase}
							className='flex h-16 w-16 items-center justify-center rounded-full border bg-white/60 backdrop-blur-sm transition-all hover:bg-white/80'>
							<SkipForward className='h-5 w-5' />
						</motion.button>
					)}
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleReset}
						className='flex h-16 w-16 items-center justify-center rounded-full border bg-white/60 backdrop-blur-sm transition-all hover:bg-white/80'>
						<RotateCcw className='h-5 w-5' />
					</motion.button>
				</div>
			</motion.div>
		</div>
	)
}

interface TimeDisplayProps {
	time: number
}

function TimeDisplay({ time }: TimeDisplayProps) {
	const totalSeconds = Math.floor(time / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60

	const hoursStr = hours.toString().padStart(2, '0')
	const minutesStr = minutes.toString().padStart(2, '0')
	const secondsStr = seconds.toString().padStart(2, '0')

	return (
		<div className='flex items-center justify-center gap-1.5'>
			{hours > 0 && (
				<>
					<SevenSegmentDigit value={parseInt(hoursStr[0])} />
					<SevenSegmentDigit value={parseInt(hoursStr[1])} />
					<Colon />
				</>
			)}
			<SevenSegmentDigit value={parseInt(minutesStr[0])} />
			<SevenSegmentDigit value={parseInt(minutesStr[1])} />
			<Colon />
			<SevenSegmentDigit value={parseInt(secondsStr[0])} />
			<SevenSegmentDigit value={parseInt(secondsStr[1])} />
		</div>
	)
}

interface SevenSegmentDigitProps {
	value: number
	className?: string
}

function SevenSegmentDigit({ value, className }: SevenSegmentDigitProps) {
	const segments = SEGMENT_MAP[value] || SEGMENT_MAP[0]
	const activeColor = 'var(--color-primary)'
	const inactiveColor = 'rgba(0, 0, 0, 0.05)'

	return (
		<svg width='29' height='52' viewBox='0 0 29 52' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
			{SEGMENT_PATHS.map((d, i) => (
				<path key={i} d={d} fill={segments[i] ? activeColor : inactiveColor} />
			))}
		</svg>
	)
}

function Colon({ className }: { className?: string }) {
	return (
		<div className={`flex flex-col justify-center gap-2 ${className}`}>
			<div className='bg-primary h-1.5 w-1.5' />
			<div className='bg-primary h-1.5 w-1.5' />
		</div>
	)
}
