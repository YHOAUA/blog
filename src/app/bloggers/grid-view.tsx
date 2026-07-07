'use client'

import { useState } from 'react'

import { type AvatarItem } from './components/avatar-upload-dialog'
import { BloggerCard } from './components/blogger-card'

export interface Blogger {
	name: string
	avatar: string
	url: string
	description: string
	stars: number
	category?: string
}

interface GridViewProps {
	bloggers: Blogger[]
	categories: string[]
	isEditMode?: boolean
	onUpdate?: (blogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => void
	onDelete?: (blogger: Blogger) => void
}

export default function GridView({ bloggers, categories, isEditMode = false, onUpdate, onDelete }: GridViewProps) {
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

	const filteredBloggers = bloggers.filter(blogger => {
		const matchesCategory = selectedCategory === null || (blogger.category ?? '未分类') === selectedCategory
		const matchesSearch =
			blogger.name.toLowerCase().includes(searchTerm.toLowerCase()) || blogger.description.toLowerCase().includes(searchTerm.toLowerCase())
		return matchesCategory && matchesSearch
	})

	const displayCategories = [...categories]
	const hasUncategorized = bloggers.some(b => !b.category)
	if (hasUncategorized && !displayCategories.includes('未分类')) {
		displayCategories.push('未分类')
	}

	return (
		<div className='mx-auto w-full max-w-7xl px-6 pt-24 pb-12'>
			<div className='mb-8 space-y-4'>
				<input
					type='text'
					placeholder='搜索博主...'
					value={searchTerm}
					onChange={e => setSearchTerm(e.target.value)}
					className='focus:ring-brand mx-auto block w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none'
				/>

				<div className='flex flex-wrap justify-center gap-2'>
					<button
						onClick={() => setSelectedCategory(null)}
						className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
							selectedCategory === null ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}>
						全部
					</button>
					{displayCategories.map(cat => (
						<button
							key={cat}
							onClick={() => setSelectedCategory(cat)}
							className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
								selectedCategory === cat ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							}`}>
							{cat}
						</button>
					))}
				</div>
			</div>

			<div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
				{filteredBloggers.map(blogger => (
					<BloggerCard key={blogger.url} blogger={blogger} categories={categories} isEditMode={isEditMode} onUpdate={onUpdate} onDelete={() => onDelete?.(blogger)} />
				))}
			</div>

			{filteredBloggers.length === 0 && (
				<div className='mt-12 text-center text-gray-500'>
					<p>没有找到相关博主</p>
				</div>
			)}
		</div>
	)
}
