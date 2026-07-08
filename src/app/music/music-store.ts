/**
 * [INPUT]: 依赖 zustand 的 create，依赖 ./music-config 的配置和类型
 * [OUTPUT]: 对外提供 useMusicStore hook（playlist / currentIndex / isPlaying / progress / lyrics 等）
 * [POS]: music 模块的全局状态管理，被 MusicCard、MusicMiniBar 和全屏播放页面共享
 * [NOTE]: audio 为全局单例，监听器在 store 创建时一次性挂载；
 *         isPlaying 由 audio 的 play/pause 事件统一驱动，禁手动散乱 setState；
 *         loadTrack 对同一 url 幂等，避免路由切换打断当前播放
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

// audio 是全局单例，与 store 创建时机解耦，整页生命周期只持有一份
let audio: HTMLAudioElement | null = null
let shuffleQueue: number[] = []
let shuffleIndex = 0
// 监听器只挂一次：audio 全局单例为其私有资产，挂载与 React mount/unmount 无关
let listenersAttached = false

function getAudio(): HTMLAudioElement {
	if (!audio) {
		if (typeof window === 'undefined') throw new Error('Audio not available on server')
		audio = new Audio()
		audio.volume = musicConfig.volume
	}
	return audio
}

// 规范化 url 用于幕等比较，避免相对/绝对路径假阴性
function normalizeUrl(url: string): string {
	try {
		return new URL(url, window.location.href).href
	} catch {
		return url
	}
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

// 载入指定曲目为当前播放：幕等保护同一 url 不重赋 src，避免路由切换把正在播的歌打回起点
function loadTrack(index: number, autoPlay: boolean) {
	const { playlist } = useMusicStore.getState()
	if (index < 0 || index >= playlist.length) return

	const track = playlist[index]
	const a = getAudio()

	if (a.src && normalizeUrl(a.src) === normalizeUrl(track.url)) {
		// 同一首：仅对齐 index，进度与歌词保持现状，不破坏播放
		useMusicStore.setState({ currentIndex: index })
		if (autoPlay && a.paused) {
			a.play().then(() => useMusicStore.setState({ isPlaying: true })).catch(() => {})
		}
		return
	}

	a.src = track.url
	a.load()
	useMusicStore.setState({ currentIndex: index, progress: 0, currentTime: 0, duration: 0, currentLrcIndex: -1 })

	loadLyrics(track).then(lyrics => useMusicStore.setState({ lyrics }))

	if (autoPlay) {
		a.play().then(() => useMusicStore.setState({ isPlaying: true })).catch(() => {})
	}
}

// 为 audio 单例挂载事件监听器，与 store 状态同步；只挂一次，整页生命周期复用
function setupAudioListeners() {
	const a = getAudio()

	a.addEventListener('timeupdate', () => {
		if (isNaN(a.duration)) return
		const currentTime = a.currentTime
		const duration = a.duration
		const progress = (currentTime / duration) * 100

		const { lyrics, currentLrcIndex } = useMusicStore.getState()
		let newLrcIndex = -1
		for (let i = 0; i < lyrics.length; i++) {
			if (currentTime >= lyrics[i].time) newLrcIndex = i
			else break
		}

		if (newLrcIndex !== currentLrcIndex) {
			useMusicStore.setState({ currentTime, duration, progress, currentLrcIndex: newLrcIndex })
		} else {
			useMusicStore.setState({ currentTime, duration, progress })
		}
	})

	a.addEventListener('ended', () => {
		const { playMode, currentIndex, playlist } = useMusicStore.getState()
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
		useMusicStore.setState({ duration: a.duration })
	})

	// isPlaying 由 audio 的 play/pause 事件统一驱动，移除手动 setState 的散乱
	a.addEventListener('play', () => useMusicStore.setState({ isPlaying: true }))
	a.addEventListener('pause', () => useMusicStore.setState({ isPlaying: false }))
}

export const useMusicStore = create<MusicStore>((set, get) => {
	// store 创建即挂载监听器一次：audio 全局单例先于组件就绪，监听器与其同生共死
	if (typeof window !== 'undefined' && !listenersAttached) {
		setupAudioListeners()
		listenersAttached = true
	}

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

			set({ loading: true })

			try {
				let playlist = await fetchMetingData()
				if (playlist.length === 0) {
					playlist = musicConfig.localPlaylist
				}

				set({ playlist, initialized: true, loading: false })

				if (playlist.length > 0) {
					// 若 audio 当前已在播放某曲目，且新歌单中仍含该曲目，
					// 仅修正 currentIndex 使其与新歌单对齐，不打断当前播放
					const a = getAudio()
					let startIndex = -1
					if (a.src) {
						const currentHref = normalizeUrl(a.src)
						startIndex = playlist.findIndex(t => normalizeUrl(t.url) === currentHref)
					}

					if (startIndex === -1) {
						startIndex = musicConfig.playMode === 'random'
							? Math.floor(Math.random() * playlist.length)
							: 0
						loadTrack(startIndex, false)
					} else {
						set({ currentIndex: startIndex })
						// 歌词可能在首次 init 时尚未加载，补一次
						loadLyrics(playlist[startIndex]).then(lyrics => set({ lyrics }))
					}
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

			// isPlaying 改由 play/pause 监听器统一驱动，这里只发指令
			if (isPlaying) {
				a.pause()
			} else {
				a.play().catch(() => {})
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
