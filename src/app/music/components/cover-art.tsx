/**
 * [INPUT]: 依赖 react, clsx
 * [OUTPUT]: 对外提供 CoverArt 组件
 * [POS]: music/components 的封面渲染器，被全屏播放页面消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import clsx from 'clsx'

interface CoverArtProps {
	src: string
	isPlaying: boolean
	onColorExtracted?: (color: string) => void
}

export default function CoverArt({ src, isPlaying, onColorExtracted }: CoverArtProps) {
	const imgRef = useRef<HTMLImageElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [loaded, setLoaded] = useState(false)
	const [rotation, setRotation] = useState(0)
	const animRef = useRef<number>(0)
	const lastTimeRef = useRef<number>(0)

	const extractColor = useCallback(() => {
		if (!imgRef.current || !canvasRef.current || !onColorExtracted) return

		const canvas = canvasRef.current
		const ctx = canvas.getContext('2d', { willReadFrequently: true })
		if (!ctx) return

		canvas.width = 50
		canvas.height = 50

		try {
			ctx.drawImage(imgRef.current, 0, 0, 50, 50)
			const data = ctx.getImageData(0, 0, 50, 50).data

			let r = 0, g = 0, b = 0, count = 0
			for (let i = 0; i < data.length; i += 16) {
				r += data[i]
				g += data[i + 1]
				b += data[i + 2]
				count++
			}

			r = Math.round(r / count)
			g = Math.round(g / count)
			b = Math.round(b / count)

			onColorExtracted(`${r}, ${g}, ${b}`)
		} catch {
			onColorExtracted('53, 79, 82')
		}
	}, [onColorExtracted])

	useEffect(() => {
		if (!isPlaying) {
			cancelAnimationFrame(animRef.current)
			return
		}

		const animate = (time: number) => {
			if (lastTimeRef.current) {
				const delta = time - lastTimeRef.current
				setRotation(prev => (prev + delta * 0.02) % 360)
			}
			lastTimeRef.current = time
			animRef.current = requestAnimationFrame(animate)
		}

		animRef.current = requestAnimationFrame(animate)

		return () => {
			cancelAnimationFrame(animRef.current)
			lastTimeRef.current = 0
		}
	}, [isPlaying])

	return (
		<div className='relative'>
			<canvas ref={canvasRef} className='hidden' />

			<div
				className={clsx(
					'relative mx-auto aspect-square w-64 overflow-hidden rounded-full shadow-2xl sm:w-72 md:w-80',
					'ring-4 ring-white/20'
				)}
				style={{ transform: `rotate(${rotation}deg)` }}>
				{src ? (
					<img
						ref={imgRef}
						src={src}
						crossOrigin='anonymous'
						alt='Album cover'
						className={clsx('h-full w-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
						onLoad={() => {
							setLoaded(true)
							extractColor()
						}}
					/>
				) : null}

				{!loaded && (
					<div className='absolute inset-0 flex items-center justify-center bg-white/10'>
						<div className='h-16 w-16 rounded-full bg-white/20' />
					</div>
				)}

				<div className='absolute inset-0 flex items-center justify-center'>
					<div className='h-12 w-12 rounded-full bg-black/80 ring-2 ring-white/10' />
				</div>
			</div>
		</div>
	)
}
