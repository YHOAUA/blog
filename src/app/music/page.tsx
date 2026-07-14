/**
 * [INPUT]: 依赖 react, next/navigation, lucide-react, motion, ./music-store, @/consts
 * [OUTPUT]: 对外提供全屏音乐播放页面
 * [POS]: music 模块的入口页面
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ListMusic, Volume2, Music, Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, VolumeX, Minus, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useMusicStore } from './music-store'
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'
import { upgradeCoverUrl } from './music-config'

export default function MusicPage() {
	const router = useRouter()
	const [showPlaylist, setShowPlaylist] = useState(false)
	const [showLyrics, setShowLyrics] = useState(false)
	const [coverLoaded, setCoverLoaded] = useState(false)
	const coverRef = useRef<HTMLImageElement>(null)
	const activeLyricRef = useRef<HTMLDivElement>(null)

	const {
		playlist,
		currentIndex,
		isPlaying,
		playMode,
		volume,
		progress,
		currentTime,
		duration,
		lyrics,
		currentLrcIndex,
		initialized,
		loading,
		init,
		togglePlay,
		playNext,
		playPrev,
		cyclePlayMode,
		setVolume,
		seek,
		playTrackByIndex
	} = useMusicStore()

	useEffect(() => {
		if (!initialized && !loading) {
			init()
		}
	}, [initialized, loading, init])

	useEffect(() => {
		if (activeLyricRef.current && showLyrics) {
			activeLyricRef.current.scrollIntoView({
				behavior: 'smooth',
				block: 'center'
			})
		}
	}, [currentLrcIndex, showLyrics])

	const currentTrack = playlist[currentIndex]
	const ModeIcon = playMode === 'one' ? Repeat1 : playMode === 'random' ? Shuffle : Repeat
	const coverSrc = currentTrack?.pic ? upgradeCoverUrl(currentTrack.pic) : ''

	function formatTime(seconds: number): string {
		if (!seconds || isNaN(seconds)) return '0:00'
		const min = Math.floor(seconds / 60)
		const sec = Math.floor(seconds % 60)
		return `${min}:${sec < 10 ? '0' : ''}${sec}`
	}

	useEffect(() => {
		if (coverSrc && coverRef.current) {
			setCoverLoaded(false)
			coverRef.current.src = coverSrc
		}
	}, [coverSrc])

	return (
		<div className='relative flex min-h-screen items-center justify-center px-6 py-12 text-sm'>
			<div className='flex w-full max-w-2xl flex-col gap-6'>
				{/* 返回 */}
				<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: INIT_DELAY }}>
					<button onClick={() => router.back()} className='text-secondary hover:text-primary inline-flex items-center gap-2 transition-colors'>
						<ArrowLeft className='h-4 w-4' />
						<span>返回</span>
					</button>
				</motion.div>

				{/* 主播放器卡片 */}
				<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: INIT_DELAY + ANIMATION_DELAY }} className='card relative'>
					{loading && (
						<div className='flex flex-col gap-4 p-1'>
							<div className='mb-2 flex items-center gap-2 px-1'>
								<div className='h-14 w-14 shrink-0'>
									<div className='bg-brand/10 relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-lg'>
										<Loader2 className='text-brand h-6 w-6 animate-spin' />
									</div>
								</div>

								<div className='flex-1 space-y-1.5 overflow-hidden'>
									<div className='h-3.5 w-3/5 animate-pulse rounded-full bg-neutral-200/70' />
									<div className='h-2.5 w-2/5 animate-pulse rounded-full bg-neutral-200/70' />
									<div className='mt-2 h-1 w-full animate-pulse rounded-full bg-neutral-200/50' />
								</div>
							</div>

							<div className='px-1'>
								<div className='mb-2 mt-2 h-1 w-full animate-pulse rounded-full bg-neutral-200/50' />
							</div>

							<div className='flex items-center justify-between px-1'>
								<div className='h-5 w-5 animate-pulse rounded bg-neutral-200/50' />
								<div className='h-7 w-7 animate-pulse rounded-full bg-neutral-200/50' />
								<div className='h-12 w-12 animate-pulse rounded-full bg-neutral-200/60' />
								<div className='h-7 w-7 animate-pulse rounded-full bg-neutral-200/50' />
								<div className='h-5 w-5 animate-pulse rounded bg-neutral-200/50' />
							</div>
						</div>
					)}

					{!loading && currentTrack && (
						<>
							{/* 顶部：封面 + 信息 */}
							<div className='mb-2 flex items-center gap-2 px-1'>
								{/* 封面 */}
								<div className='group relative h-14 w-14 shrink-0'>
									<div className='bg-brand/10 relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-lg'>
										<Music className='text-brand absolute text-2xl opacity-40' />
										<img
											ref={coverRef}
											className={`relative z-10 h-full w-full object-cover transition-opacity duration-300 ${coverLoaded ? 'opacity-100' : 'opacity-0'} ${isPlaying ? 'animate-spin' : ''}`}
											style={{ animationDuration: '20s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}
											alt={currentTrack.name}
											onLoad={() => setCoverLoaded(true)}
										/>
									</div>
								</div>

								{/* 信息区 */}
								<div className='min-w-0 flex-1 overflow-hidden'>
									<div className='flex items-center justify-between gap-2 overflow-hidden'>
										<div className='relative min-w-0 flex-1 overflow-hidden'>
											<h3 className='truncate text-base font-bold leading-tight text-neutral-800'>{currentTrack.name}</h3>
										</div>
										{lyrics.length > 0 && (
											<button
												onClick={() => {
													setShowLyrics(!showLyrics)
													if (!showLyrics) setShowPlaylist(false)
												}}
												className='text-brand shrink-0 p-0.5 pr-2 transition-all duration-300 active:scale-95'
												title='歌词'>
												<Minus className='h-5 w-5' />
											</button>
										)}
									</div>

									<div className='min-w-0 overflow-hidden'>
										<p className='truncate text-xs font-medium text-neutral-500'>{currentTrack.artist}</p>
									</div>

									{/* 时间 + 音量 */}
									<div className='flex h-5 items-center gap-3 text-neutral-400'>
										<div className='flex h-full shrink-0 items-center gap-1 font-mono text-[10px]'>
											<span>{formatTime(currentTime)}</span>
											<span className='opacity-50'>/</span>
											<span>{formatTime(duration)}</span>
										</div>

										<div className='ml-auto flex h-full items-center gap-1 bg-transparent'>
											<button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className='hover:text-brand flex items-center rounded-md p-0.5 transition-colors' title='音量'>
												{volume === 0 ? <VolumeX className='h-[18px] w-[18px]' /> : <Volume2 className='h-[18px] w-[18px]' />}
											</button>
											<div className='flex w-16 items-center transition-all duration-300 ease-out'>
												<div
													className='relative ml-1 h-1 w-16 cursor-pointer rounded-full bg-neutral-200'
													onClick={e => {
														const rect = e.currentTarget.getBoundingClientRect()
														const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
														setVolume(percent)
													}}>
													<div className='bg-brand absolute left-0 top-0 h-full rounded-full' style={{ width: `${volume * 100}%` }} />
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* 进度条 */}
							<div className='px-1'>
								<div
									className='group relative mb-2 mt-2 h-1 cursor-pointer touch-none rounded-full bg-slate-200'
									onClick={e => {
										const rect = e.currentTarget.getBoundingClientRect()
										const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
										seek(percent)
									}}>
									<div className='bg-brand absolute left-0 top-0 h-full rounded-full transition-[width] duration-100' style={{ width: `${progress}%` }} />
									<div
										className='bg-brand absolute top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 scale-0 rounded-full shadow-sm ring-2 ring-white transition-transform duration-200 group-hover:scale-100'
										style={{ left: `${progress}%` }}
									/>
								</div>
							</div>

							{/* 控制按钮 */}
							<div className='flex select-none items-center justify-between px-1'>
								<button onClick={cyclePlayMode} className={`p-2 transition-colors active:scale-95 ${playMode === 'list' ? 'text-neutral-300 hover:text-brand' : 'text-brand'}`} title='播放模式'>
									<ModeIcon className='h-5 w-5' />
								</button>

								<button onClick={playPrev} className='text-secondary hover:text-brand p-2 transition-colors active:scale-95' title='上一首'>
									<SkipBack className='h-[30px] w-[30px]' />
								</button>

								<button
									onClick={togglePlay}
									className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${isPlaying ? 'bg-brand text-white hover:brightness-110' : 'text-brand bg-white/60 shadow-sm hover:bg-white/80'}`}
									title={isPlaying ? '暂停' : '播放'}>
									{isPlaying ? <Pause className='h-[30px] w-[30px]' /> : <Play className='ml-0.5 h-[30px] w-[30px]' />}
								</button>

								<button onClick={playNext} className='text-secondary hover:text-brand p-2 transition-colors active:scale-95' title='下一首'>
									<SkipForward className='h-[30px] w-[30px]' />
								</button>

								<button
									onClick={() => {
										setShowPlaylist(!showPlaylist)
										if (!showPlaylist) setShowLyrics(false)
									}}
									className='text-secondary hover:text-brand p-2 transition-all duration-300 active:scale-95'
									title='播放列表'>
									<ListMusic className='h-5 w-5' />
								</button>
							</div>

							{/* 歌词抽屉 */}
							<div
								className='grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
								style={{ gridTemplateRows: showLyrics && lyrics.length > 0 ? '1fr' : '0fr', opacity: showLyrics && lyrics.length > 0 ? 1 : 0 }}>
								<div className='min-h-0 overflow-hidden'>
									<div className='mx-1 mt-2 border-t border-neutral-100 pt-2'>
										<div className='custom-scrollbar relative flex h-48 scroll-smooth flex-col items-center gap-2 overflow-y-auto p-4 py-24 text-center'>
											{lyrics.length === 0 ? (
												<div className='py-10 text-sm text-neutral-400'>暂无歌词</div>
											) : (
												lyrics.map((line, i) => (
													<div
														key={i}
														ref={i === currentLrcIndex ? activeLyricRef : null}
														onClick={() => {
															const percent = duration > 0 ? line.time / duration : 0
															seek(percent)
														}}
														className={`cursor-pointer py-1 text-sm transition-all duration-300 hover:text-brand ${i === currentLrcIndex ? 'text-brand font-medium' : 'text-neutral-400'}`}>
														{line.text}
													</div>
												))
											)}
										</div>
									</div>
								</div>
							</div>

							{/* 播放列表抽屉 */}
							<div className='grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' style={{ gridTemplateRows: showPlaylist ? '1fr' : '0fr', opacity: showPlaylist ? 1 : 0 }}>
								<div className='min-h-0 overflow-hidden'>
									<div className='mx-1 mt-2 border-t border-neutral-100 pt-2'>
										<div className='custom-scrollbar flex max-h-48 flex-col gap-1 overflow-y-auto pb-1 pr-1'>
											{playlist.map((track, i) => (
												<button
													key={i}
													onClick={() => {
														playTrackByIndex(i)
													}}
													className={`group flex cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-neutral-50 ${i === currentIndex ? 'bg-neutral-100' : ''}`}>
													<div className='relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-neutral-200'>
														{track.pic ? (
															<img src={upgradeCoverUrl(track.pic)} alt='' className='h-full w-full object-cover' loading='lazy' />
														) : (
															<Music className='text-brand/40 h-4 w-4' />
														)}
														{i === currentIndex && (
															<div className='bg-brand/20 absolute inset-0 flex items-center justify-center'>
																<div className='flex gap-0.5'>
																	<div className='bg-brand h-2 w-0.5 animate-pulse rounded-full' />
																	<div className='bg-brand h-2 w-0.5 animate-pulse rounded-full' style={{ animationDelay: '0.15s' }} />
																	<div className='bg-brand h-2 w-0.5 animate-pulse rounded-full' style={{ animationDelay: '0.3s' }} />
																</div>
															</div>
														)}
													</div>
													<div className='min-w-0 flex-1'>
														<div className={`truncate text-xs font-bold transition-colors group-hover:text-brand ${i === currentIndex ? 'text-brand' : 'text-neutral-700'}`}>{track.name}</div>
														<div className='truncate text-[10px] text-neutral-400'>{track.artist}</div>
													</div>
												</button>
											))}
										</div>
									</div>
								</div>
							</div>
						</>
					)}

					{!loading && !currentTrack && (
						<div className='text-secondary py-12 text-center'>
							<Music className='mx-auto mb-2 h-12 w-12 opacity-20' />
							<p>暂无歌曲</p>
						</div>
					)}
				</motion.div>
			</div>
		</div>
	)
}
