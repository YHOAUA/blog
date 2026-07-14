/**
 * [INPUT]: 依赖 react, next/navigation, lucide-react, @/app/music/music-store
 * [OUTPUT]: 对外提供 MusicMiniBar 组件（移动端底部迷你播放条）
 * [POS]: components 的移动端音乐入口，底部吸附，点击跳转全屏播放页
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Pause, Play, Music } from 'lucide-react'
import { useMusicStore } from '@/app/music/music-store'

export default function MusicMiniBar() {
	const pathname = usePathname()
	const router = useRouter()
	const { isPlaying, progress, playlist, currentIndex, togglePlay, init, initialized } = useMusicStore()

	useEffect(() => {
		if (!initialized) {
			init()
		}
	}, [initialized, init])

	const currentTrack = playlist[currentIndex]

	if (pathname === '/music') return null
	if (!currentTrack && !isPlaying) return null

	const handlePlayClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		togglePlay()
	}

	return (
		<div
			className='fixed bottom-4 left-3 right-3 z-50 flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur-xl'
			onClick={() => router.push('/music')}>
			{/* 封面 */}
			<div className='flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/10'>
				{currentTrack?.pic ? (
					<img
						src={currentTrack.pic}
						alt=''
						className={`h-full w-full object-cover ${isPlaying ? 'animate-spin' : ''}`}
						style={{ animationDuration: '20s', animationTimingFunction: 'linear' }}
					/>
				) : (
					<Music className='h-4 w-4 text-brand' />
				)}
			</div>

			{/* 曲名 + 进度 */}
			<div className='min-w-0 flex-1'>
				<div className='truncate text-xs font-medium text-neutral-700'>{currentTrack?.name || 'Music'}</div>
				<div className='mt-1 h-1 rounded-full bg-neutral-200'>
					<div className='h-full rounded-full bg-brand transition-all duration-300' style={{ width: `${progress}%` }} />
				</div>
			</div>

			{/* 播放/暂停 */}
			<button
				onClick={handlePlayClick}
				className='bg-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm active:scale-95'>
				{isPlaying ? <Pause className='h-3.5 w-3.5' /> : <Play className='ml-0.5 h-3.5 w-3.5' />}
			</button>
		</div>
	)
}
