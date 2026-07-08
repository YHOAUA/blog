'use client'
import { PropsWithChildren, useEffect } from 'react'
import { useCenterInit } from '@/hooks/use-center'
import BlurredBubblesBackground from './backgrounds/blurred-bubbles'
import NavCard from '@/components/nav-card'
import { Toaster } from 'sonner'
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { useSize, useSizeInit } from '@/hooks/use-size'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { ScrollTopButton } from '@/components/scroll-top-button'
import MusicCard from '@/components/music-card'
import MusicMiniBar from '@/components/music-mini-bar'
import { useMusicStore } from '@/app/music/music-store'

export default function Layout({ children }: PropsWithChildren) {
	useCenterInit()
	useSizeInit()
	const { cardStyles, siteContent, regenerateKey } = useConfigStore()
	const { maxSM, init } = useSize()
	const { lyrics, currentLrcIndex, isPlaying } = useMusicStore()

	const backgroundImages = (siteContent.backgroundImages ?? []) as Array<{ id: string; url: string }>
	const currentBackgroundImageId = siteContent.currentBackgroundImageId
	const currentBackgroundImage =
		currentBackgroundImageId && currentBackgroundImageId.trim() ? backgroundImages.find(item => item.id === currentBackgroundImageId) : null

	// 歌词标题同步
	useEffect(() => {
		const originalTitle = siteContent.meta?.title || '伊霍安'

		if (isPlaying && lyrics.length > 0 && currentLrcIndex >= 0 && currentLrcIndex < lyrics.length) {
			const currentLyric = lyrics[currentLrcIndex].text

			// 提取括号内的中文翻译：原文 (翻译)
			const translationMatch = currentLyric.match(/\(([^)]*[一-龥][^)]*)\)/)
			if (translationMatch) {
				const translation = translationMatch[1].trim()
				document.title = translation
			}
			// 如果没有括号，但整行是中文，直接显示
			else if (/[一-龥]/.test(currentLyric) && currentLyric.trim()) {
				document.title = currentLyric
			}
			// 否则保持原标题
			else {
				document.title = originalTitle
			}
		} else {
			document.title = originalTitle
		}

		return () => {
			document.title = originalTitle
		}
	}, [lyrics, currentLrcIndex, isPlaying, siteContent.meta?.title])

	return (
		<>
			<Toaster
				position='bottom-right'
				richColors
				icons={{
					success: <CircleCheckIcon className='size-4' />,
					info: <InfoIcon className='size-4' />,
					warning: <TriangleAlertIcon className='size-4' />,
					error: <OctagonXIcon className='size-4' />,
					loading: <Loader2Icon className='size-4 animate-spin' />
				}}
				style={
					{
						'--border-radius': '12px'
					} as React.CSSProperties
				}
			/>
			{currentBackgroundImage && (
				<div
					className='fixed inset-0 z-0 overflow-hidden'
					style={{
						backgroundImage: `url(${currentBackgroundImage.url})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						backgroundRepeat: 'no-repeat'
					}}
				/>
			)}
			<BlurredBubblesBackground colors={siteContent.backgroundColors} regenerateKey={regenerateKey} />

			<main className='relative z-10 h-full'>
				{children}
				<NavCard />

				{!maxSM && cardStyles.musicCard?.enabled !== false && <MusicCard />}
			</main>

			{maxSM && init && <ScrollTopButton className='bg-brand/20 fixed right-6 bottom-20 z-50 shadow-md' />}
			{maxSM && init && cardStyles.musicCard?.enabled !== false && <MusicMiniBar />}
		</>
	)
}
