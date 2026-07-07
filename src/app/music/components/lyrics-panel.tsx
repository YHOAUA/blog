/**
 * [INPUT]: 依赖 react, clsx
 * [OUTPUT]: 对外提供 LyricsPanel 组件
 * [POS]: music/components 的歌词滚动面板，被全屏播放页面消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { useEffect, useRef } from 'react'
import clsx from 'clsx'

interface LyricLine {
	time: number
	text: string
}

interface LyricsPanelProps {
	lyrics: LyricLine[]
	currentIndex: number
}

export default function LyricsPanel({ lyrics, currentIndex }: LyricsPanelProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const activeRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (activeRef.current && containerRef.current) {
			activeRef.current.scrollIntoView({
				behavior: 'smooth',
				block: 'center'
			})
		}
	}, [currentIndex])

	if (lyrics.length === 0) {
		return (
			<div className='text-secondary flex h-48 items-center justify-center text-sm'>
				暂无歌词
			</div>
		)
	}

	return (
		<div ref={containerRef} className='custom-scrollbar relative h-64 overflow-y-auto px-4 sm:h-80'>
			<div className='pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-white to-transparent' />
			<div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-white to-transparent' />

			<div className='flex flex-col items-center gap-4 py-24'>
				{lyrics.map((line, i) => (
					<div
						key={`${line.time}-${i}`}
						ref={i === currentIndex ? activeRef : undefined}
						className={clsx(
							'text-center transition-all duration-500',
							i === currentIndex ? 'scale-105 text-base font-semibold text-black' : 'text-secondary text-sm'
						)}>
						{line.text}
					</div>
				))}
			</div>
		</div>
	)
}
