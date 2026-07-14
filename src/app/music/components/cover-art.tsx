/**
 * [INPUT]: 依赖 react, clsx, ../music-config 的 upgradeCoverUrl
 * [OUTPUT]: 对外提供 CoverArt 组件
 * [POS]: music/components 的封面渲染器，被全屏播放页面消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import clsx from 'clsx'
import { upgradeCoverUrl } from '../music-config'

interface CoverArtProps {
	src: string
	isPlaying: boolean
	onColorExtracted?: (color: string) => void
}

export default function CoverArt({ src, isPlaying, onColorExtracted }: CoverArtProps) {
	const imgRef = useRef<HTMLImageElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [loaded, setLoaded] = useState(false)
	const [displaySrc, setDisplaySrc] = useState('')
	const [rotation, setRotation] = useState(0)
	const animRef = useRef<number>(0)
	const lastTimeRef = useRef<number>(0)

	// 源变更时先升级分辨率，再重置加载态
	useEffect(() => {
		setLoaded(false)
		setDisplaySrc(upgradeCoverUrl(src))
	}, [src])

	const extractColor = useCallback(() => {
		if (!imgRef.current || !canvasRef.current || !onColorExtracted) return

		const canvas = canvasRef.current
		const ctx = canvas.getContext('2d', { willReadFrequently: true })
		if (!ctx) return

		// 取色只需小图；显示仍用原图高清
		canvas.width = 40
		canvas.height = 40

		try {
			ctx.drawImage(imgRef.current, 0, 0, 40, 40)
			const data = ctx.getImageData(0, 0, 40, 40).data

			let r = 0,
				g = 0,
				b = 0,
				count = 0
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
			// 跨域失败时回退 brand
			onColorExtracted('53, 191, 171')
		}
	}, [onColorExtracted])

	useEffect(() => {
		if (!isPlaying) {
			cancelAnimationFrame(animRef.current)
			lastTimeRef.current = 0
			return
		}

		const animate = (time: number) => {
			if (lastTimeRef.current) {
				const delta = time - lastTimeRef.current
				// ~18s 一圈，比 CSS 默认更稳
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
		<div className='relative mx-auto w-fit'>
			<canvas ref={canvasRef} className='hidden' />

			{/* 外圈柔光，吃封面主色由父级氛围底承担；这里只做轻微 ring */}
			<div
				className={clsx(
					'relative aspect-square w-[min(80vw,22rem)] overflow-hidden rounded-full sm:w-80 md:w-96',
					'shadow-[0_28px_70px_-22px_rgba(0,0,0,0.38)] ring-4 ring-white/25'
				)}
				style={{ transform: `rotate(${rotation}deg)`, willChange: 'transform' }}>
				{displaySrc ? (
					<img
						ref={imgRef}
						src={displaySrc}
						// 取色需要像素；跨域失败时 onerror 会回退原图
						crossOrigin='anonymous'
						alt='Album cover'
						decoding='async'
						// 按 2x/3x 屏要大图
						sizes='(max-width: 640px) 80vw, 384px'
						className={clsx(
							'h-full w-full object-cover transition-opacity duration-500',
							// 关键清晰：禁止浏览器过度平滑
							'[image-rendering:auto]',
							loaded ? 'opacity-100' : 'opacity-0'
						)}
						onLoad={() => {
							setLoaded(true)
							extractColor()
						}}
						onError={() => {
							// 高清地址失败时回退原始 src
							if (displaySrc !== src && src) {
								setDisplaySrc(src)
							}
						}}
					/>
				) : null}

				{!loaded && (
					<div className='absolute inset-0 flex items-center justify-center bg-white/10'>
						<div className='h-16 w-16 rounded-full bg-white/20' />
					</div>
				)}

				{/* 黑胶中心孔 */}
				<div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
					<div className='h-14 w-14 rounded-full bg-black/75 ring-2 ring-white/15 shadow-inner' />
					<div className='absolute h-3 w-3 rounded-full bg-white/30' />
				</div>
			</div>
		</div>
	)
}
