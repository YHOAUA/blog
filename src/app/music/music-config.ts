/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 musicConfig、MusicTrack、METING_APIS、upgradeCoverUrl
 * [POS]: music 模块的配置中心，被 music-store 和播放页面消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface MusicTrack {
	name: string
	artist: string
	url: string
	pic: string
	lrc?: string
}

/** 网易云等封面常带 ?param=90y90 / 300y300 缩略图；抬到高清 */
export function upgradeCoverUrl(pic: string): string {
	if (!pic) return pic
	const HI = 2000
	try {
		const u = new URL(pic, typeof window !== 'undefined' ? window.location.href : 'https://localhost')
		if (/music\.(126|163)\.net/i.test(u.hostname) || u.searchParams.has('param')) {
			u.searchParams.set('param', `${HI}y${HI}`)
		}
		return u.toString()
	} catch {
		return pic.replace(/([?&])param=\d+y\d+/i, `$1param=${HI}y${HI}`)
	}
}

export const METING_APIS = [
	'https://meting.elysium-stack.cn/?server=:server&type=:type&id=:id&auth=:auth&r=:r',
	'https://music.3e0.cn/?server=:server&type=:type&id=:id',
	'https://api.qijieya.cn/meting/?server=:server&type=:type&id=:id',
	'https://v.iarc.top/?type=:type&id=:id&r=:r',
	'https://api.moeyao.cn/meting/?server=:server&type=:type&id=:id'
]

export const musicConfig = {
	server: 'netease' as const,
	type: 'playlist' as const,
	id: '8282573592',
	volume: 0.7,
	playMode: 'random' as 'list' | 'one' | 'random',

	localPlaylist: [
		{
			name: 'Close To You',
			artist: 'Unknown',
			url: '/music/close-to-you.mp3',
			pic: '',
			lrc: ''
		}
	] satisfies MusicTrack[]
}
