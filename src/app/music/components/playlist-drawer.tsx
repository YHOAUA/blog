/**
 * [INPUT]: 依赖 react, clsx, lucide-react, ../music-config 的 MusicTrack 类型
 * [OUTPUT]: 对外提供 PlaylistDrawer 组件
 * [POS]: music/components 的播放列表抽屉，被全屏播放页面消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { X, Music } from 'lucide-react'
import clsx from 'clsx'
import type { MusicTrack } from '../music-config'

interface PlaylistDrawerProps {
	open: boolean
	playlist: MusicTrack[]
	currentIndex: number
	onClose: () => void
	onSelect: (index: number) => void
}

export default function PlaylistDrawer({ open, playlist, currentIndex, onClose, onSelect }: PlaylistDrawerProps) {
	return (
		<div
			className={clsx(
				'fixed inset-y-0 right-0 z-50 w-80 transform border-l bg-card/95 shadow-xl backdrop-blur-md transition-transform duration-300 sm:w-96',
				open ? 'translate-x-0' : 'translate-x-full'
			)}>
			<div className='flex items-center justify-between border-b border-slate-200 px-5 py-4'>
				<h3 className='text-secondary text-sm font-medium'>播放列表 ({playlist.length})</h3>
				<button onClick={onClose} className='text-secondary transition-colors hover:text-black'>
					<X className='h-5 w-5' />
				</button>
			</div>

			<div className='custom-scrollbar h-full overflow-y-auto pb-20'>
				{playlist.map((track, i) => (
					<button
						key={`${track.url}-${i}`}
						onClick={() => onSelect(i)}
						className={clsx(
							'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-black/5',
							i === currentIndex && 'bg-brand/5'
						)}>
						<div className='bg-brand/5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md'>
							{track.pic ? (
								<img src={track.pic} alt='' className='h-full w-full object-cover' />
							) : (
								<Music className='text-brand/40 h-4 w-4' />
							)}
						</div>

						<div className='min-w-0 flex-1'>
							<div className={clsx('truncate text-sm', i === currentIndex ? 'text-brand font-medium' : 'text-primary')}>
								{track.name}
							</div>
							<div className='text-secondary truncate text-xs'>{track.artist}</div>
						</div>

						{i === currentIndex && (
							<div className='flex gap-0.5'>
								<div className='bg-brand h-3 w-0.5 animate-pulse rounded-full' />
								<div className='bg-brand h-3 w-0.5 animate-pulse rounded-full' style={{ animationDelay: '0.15s' }} />
								<div className='bg-brand h-3 w-0.5 animate-pulse rounded-full' style={{ animationDelay: '0.3s' }} />
							</div>
						)}
					</button>
				))}
			</div>
		</div>
	)
}
