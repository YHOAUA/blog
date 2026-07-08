/**
 * [INPUT]: 依赖 zustand 的 create，依赖 ./music-config 的配置和类型
 * [OUTPUT]: 对外提供 useMusicStore hook
 * [POS]: music 模块的全局状态管理，被 MusicCard 和全屏播放页面共享
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { musicConfig, METING_APIS, type MusicTrack } from './music-config'

type PlayMode = 'list' | 'one' | 'random'

interface LyricLine {
	time: number
	text: string
}

interface MusicState {
	playlist: MusicTrack[]
	currentIndex: number
	isPlaying: boolean
	playMode: PlayMode
	volume: number
	progress: number
	currentTime: number
	duration: number
	lyrics: LyricLine[]
	currentLrcIndex: number
	initialized: boolean
	loading: boolean
	error: string | null
}

interface MusicActions {
	init: () => Promise<void>
	togglePlay: () => void
	playNext: () => void
	playPrev: () => void
	cyclePlayMode: () => void
	setVolume: (vol: number) => void
	seek: (percent: number) => void
	playTrackByIndex: (index: number) => void
}

type MusicStore = MusicState & MusicActions

let audio: HTMLAudioElement | null = null
let shuffleQueue: number[] = []
let shuffleIndex = 0
let listenersAttached = false

function getAudio(): HTMLAudioElement {
	if (!audio) {
		if (typeof window === 'undefined') throw new Error('Audio not available on server')
		audio = new Audio()
		audio.volume = musicConfig.volume
	}
	return audio
}

function parseLRC(lrc: string): LyricLine[] {
	if (!lrc) return []
	const lines = lrc.split('\n')
	const result: LyricLine[] = []
	const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

	for (const line of lines) {
		const matches = Array.from(line.matchAll(timeReg))
		if (matches.length > 0) {
			const text = line.replace(timeReg, '').trim()
			if (text) {
				for (const match of matches) {
					const m = parseInt(match[1])
					const s = parseInt(match[2])
					const ms = parseInt(match[3])
					const time = m * 60 + s + ms / (match[3].length === 3 ? 1000 : 100)
					result.push({ time, text })
				}
			}
		}
	}

	return result.sort((a, b) => a.time - b.time)
}

function generateShuffleQueue(length: number, excludeIndex: number): number[] {
	const indices = Array.from({ length }, (_, i) => i).filter(i => i !== excludeIndex)
	for (let i = indices.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[indices[i], indices[j]] = [indices[j], indices[i]]
	}
	return indices
}

async function fetchMetingData(): Promise<MusicTrack[]> {
	for (const apiTemplate of METING_APIS) {
		try {
			const url = apiTemplate
				.replace(':server', musicConfig.server)
				.replace(':type', musicConfig.type)
				.replace(':id', musicConfig.id)
				.replace(':auth', '')
				.replace(':r', String(Math.random()))

			const res = await fetch(url)
			if (!res.ok) continue

			const data = await res.json()
			if (Array.isArray(data) && data.length > 0) {
				return data.map((item: Record<string, string>) => ({
					name: item.title || item.name || 'Unknown',
					artist: item.author || item.artist || 'Unknown',
					url: item.url,
					pic: item.pic || item.cover || '',
					lrc: item.lrc || ''
				}))
			}
		} catch {
			continue
		}
	}
	return []
}

async function loadLyrics(track: MusicTrack): Promise<LyricLine[]> {
	if (!track.lrc) return []

	const isUrl = /^(https?:)?\/\//.test(track.lrc) || track.lrc.startsWith('/') || /\.(lrc|txt)(\?|#|$)/i.test(track.lrc)

	if (isUrl) {
		try {
			const res = await fetch(track.lrc)
			const text = await res.text()
			return parseLRC(text)
		} catch {
			return []
		}
	}

	return parseLRC(track.lrc)
}

export const useMusicStore = create<MusicStore>((set, get) => {
	function loadTrack(index: number, autoPlay: boolean) {
		const { playlist } = get()
		if (index < 0 || index >= playlist.length) return

		const track = playlist[index]
		const a = getAudio()

		a.src = track.url
		set({ currentIndex: index, progress: 0, currentTime: 0, duration: 0, currentLrcIndex: -1 })

		loadLyrics(track).then(lyrics => set({ lyrics }))

		if (autoPlay) {
			a.play().then(() => set({ isPlaying: true })).catch(() => {})
		}
	}

	function setupAudioListeners() {
		const a = getAudio()

		a.addEventListener('timeupdate', () => {
			if (isNaN(a.duration)) return
			const currentTime = a.currentTime
			const duration = a.duration
			const progress = (currentTime / duration) * 100

			const { lyrics, currentLrcIndex } = get()
			let newLrcIndex = -1
			for (let i = 0; i < lyrics.length; i++) {
				if (currentTime >= lyrics[i].time) newLrcIndex = i
				else break
			}

			if (newLrcIndex !== currentLrcIndex) {
				set({ currentTime, duration, progress, currentLrcIndex: newLrcIndex })
			} else {
				set({ currentTime, duration, progress })
			}
		})

		a.addEventListener('ended', () => {
			const { playMode, currentIndex, playlist } = get()
			if (playMode === 'one') {
				a.currentTime = 0
				a.play()
				return
			}

			let nextIndex: number
			if (playMode === 'random') {
				if (shuffleQueue.length === 0 || shuffleIndex >= shuffleQueue.length) {
					shuffleQueue = generateShuffleQueue(playlist.length, currentIndex)
					shuffleIndex = 0
				}
				nextIndex = shuffleQueue[shuffleIndex++]
			} else {
				nextIndex = (currentIndex + 1) % playlist.length
			}
			loadTrack(nextIndex, true)
		})

		a.addEventListener('loadedmetadata', () => {
			set({ duration: a.duration })
		})
	}

	let listenersAttached = false

	return {
		playlist: [],
		currentIndex: 0,
		isPlaying: false,
		playMode: musicConfig.playMode,
		volume: musicConfig.volume,
		progress: 0,
		currentTime: 0,
		duration: 0,
		lyrics: [],
		currentLrcIndex: -1,
		initialized: false,
		loading: false,
		error: null,

		init: async () => {
			const { initialized, loading } = get()
			if (initialized || loading) return

			if (!listenersAttached) {
				setupAudioListeners()
				listenersAttached = true
			}

			set({ loading: true })

			try {
				let playlist = await fetchMetingData()
				if (playlist.length === 0) {
					playlist = musicConfig.localPlaylist
				}

				set({ playlist, initialized: true, loading: false })

				if (playlist.length > 0) {
					const startIndex = musicConfig.playMode === 'random'
						? Math.floor(Math.random() * playlist.length)
						: 0
					loadTrack(startIndex, false)
				}
			} catch {
				set({ playlist: musicConfig.localPlaylist, initialized: true, loading: false, error: '加载歌单失败' })
				if (musicConfig.localPlaylist.length > 0) {
					loadTrack(0, false)
				}
			}
		},

		togglePlay: () => {
			const a = getAudio()
			const { isPlaying, initialized } = get()

			if (!initialized) {
				get().init()
				return
			}

			if (isPlaying) {
				a.pause()
				set({ isPlaying: false })
			} else {
				a.play().then(() => set({ isPlaying: true })).catch(() => {})
			}
		},

		playNext: () => {
			const { playMode, currentIndex, playlist } = get()
			if (playlist.length === 0) return

			let nextIndex: number
			if (playMode === 'random') {
				if (shuffleQueue.length === 0 || shuffleIndex >= shuffleQueue.length) {
					shuffleQueue = generateShuffleQueue(playlist.length, currentIndex)
					shuffleIndex = 0
				}
				nextIndex = shuffleQueue[shuffleIndex++]
			} else {
				nextIndex = (currentIndex + 1) % playlist.length
			}
			loadTrack(nextIndex, true)
		},

		playPrev: () => {
			const { playMode, currentIndex, playlist } = get()
			if (playlist.length === 0) return

			let prevIndex: number
			if (playMode === 'random') {
				if (shuffleIndex <= 0) {
					shuffleQueue = generateShuffleQueue(playlist.length, currentIndex)
					shuffleIndex = shuffleQueue.length
				}
				shuffleIndex--
				prevIndex = shuffleQueue[shuffleIndex]
			} else {
				prevIndex = (currentIndex - 1 + playlist.length) % playlist.length
			}
			loadTrack(prevIndex, true)
		},

		cyclePlayMode: () => {
			const modes: PlayMode[] = ['list', 'one', 'random']
			const { playMode } = get()
			const nextMode = modes[(modes.indexOf(playMode) + 1) % modes.length]
			if (nextMode === 'random') {
				shuffleQueue = []
				shuffleIndex = 0
			}
			set({ playMode: nextMode })
		},

		setVolume: (vol: number) => {
			const v = Math.max(0, Math.min(1, vol))
			getAudio().volume = v
			set({ volume: v })
		},

		seek: (percent: number) => {
			const a = getAudio()
			if (!a.duration) return
			a.currentTime = Math.max(0, Math.min(1, percent)) * a.duration
		},

		playTrackByIndex: (index: number) => {
			const { currentIndex, isPlaying } = get()
			if (index === currentIndex && isPlaying) {
				get().togglePlay()
			} else {
				loadTrack(index, true)
			}
		}
	}
})
