/**
 * [INPUT]: 依赖 react
 * [OUTPUT]: 对外提供 ProgressBar 组件
 * [POS]: music/components 的进度条，被全屏播放页面消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { useRef, useCallback } from 'react'

interface ProgressBarProps {
	progress: number
	currentTime: number
	duration: number
	onSeek: (percent: number) => void
}

function formatTime(seconds: number): string {
	if (!seconds || isNaN(seconds)) return '0:00'
	const min = Math.floor(seconds / 60)
	const sec = Math.floor(seconds % 60)
	return `${min}:${sec < 10 ? '0' : ''}${sec}`
}

export default function ProgressBar({ progress, currentTime, duration, onSeek }: ProgressBarProps) {
	const barRef = useRef<HTMLDivElement>(null)
	const draggingRef = useRef(false)

	const handleSeek = useCallback(
		(clientX: number) => {
			if (!barRef.current) return
			const rect = barRef.current.getBoundingClientRect()
			const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
			onSeek(percent)
		},
		[onSeek]
	)

	const handleMouseDown = (e: React.MouseEvent) => {
		draggingRef.current = true
		handleSeek(e.clientX)

		const onMove = (ev: MouseEvent) => {
			if (draggingRef.current) handleSeek(ev.clientX)
		}
		const onUp = () => {
			draggingRef.current = false
			window.removeEventListener('mousemove', onMove)
			window.removeEventListener('mouseup', onUp)
		}

		window.addEventListener('mousemove', onMove)
		window.addEventListener('mouseup', onUp)
	}

	const handleTouchStart = (e: React.TouchEvent) => {
		draggingRef.current = true
		const touch = e.touches[0]
		if (touch) handleSeek(touch.clientX)

		const onMove = (ev: TouchEvent) => {
			const t = ev.touches[0]
			if (draggingRef.current && t) handleSeek(t.clientX)
		}
		const onEnd = () => {
			draggingRef.current = false
			window.removeEventListener('touchmove', onMove)
			window.removeEventListener('touchend', onEnd)
		}

		window.addEventListener('touchmove', onMove)
		window.addEventListener('touchend', onEnd)
	}

	return (
		<div className='w-full px-2'>
			<div
				ref={barRef}
				className='group relative h-1.5 cursor-pointer rounded-full bg-slate-200 transition-all hover:h-2'
				onMouseDown={handleMouseDown}
				onTouchStart={handleTouchStart}>
				<div className='bg-brand absolute inset-y-0 left-0 rounded-full transition-[width] duration-100' style={{ width: `${progress}%` }} />
				<div
					className='bg-brand absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full opacity-0 shadow-md ring-2 ring-white transition-opacity group-hover:opacity-100'
					style={{ left: `calc(${progress}% - 7px)` }}
				/>
			</div>

			<div className='text-secondary mt-2 flex justify-between text-xs'>
				<span>{formatTime(currentTime)}</span>
				<span>{formatTime(duration)}</span>
			</div>
		</div>
	)
}
