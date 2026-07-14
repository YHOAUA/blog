/**
 * [INPUT]: 依赖 react, lucide-react
 * [OUTPUT]: 对外提供 PlayerControls 组件
 * [POS]: music/components 的播放控制按钮组，被全屏播放页面消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle } from 'lucide-react'

type PlayMode = 'list' | 'one' | 'random'

interface PlayerControlsProps {
	isPlaying: boolean
	playMode: PlayMode
	onTogglePlay: () => void
	onNext: () => void
	onPrev: () => void
	onCycleMode: () => void
}

export default function PlayerControls({ isPlaying, playMode, onTogglePlay, onNext, onPrev, onCycleMode }: PlayerControlsProps) {
	const ModeIcon = playMode === 'one' ? Repeat1 : playMode === 'random' ? Shuffle : Repeat
	const modeLabel = playMode === 'one' ? '单曲循环' : playMode === 'random' ? '随机播放' : '列表循环'

	return (
		<div className='flex items-center justify-center gap-6'>
			<button onClick={onCycleMode} className='text-secondary transition-all hover:scale-110 hover:text-primary' title={modeLabel}>
				<ModeIcon className='h-5 w-5' />
			</button>

			<button onClick={onPrev} className='text-secondary transition-all hover:scale-110 hover:text-primary'>
				<SkipBack className='h-7 w-7' fill='currentColor' />
			</button>

			<button
				onClick={onTogglePlay}
				className='bg-brand hover:bg-brand/90 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105'>
				{isPlaying ? <Pause className='h-6 w-6 text-white' fill='white' /> : <Play className='ml-0.5 h-6 w-6 text-white' fill='white' />}
			</button>

			<button onClick={onNext} className='text-secondary transition-all hover:scale-110 hover:text-primary'>
				<SkipForward className='h-7 w-7' fill='currentColor' />
			</button>

			<div className='h-5 w-5' />
		</div>
	)
}
