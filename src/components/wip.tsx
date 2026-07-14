'use client'

import { motion } from 'motion/react'
import { INIT_DELAY } from '@/consts'

export default function WIP() {
	return (
		<div className='flex flex-col items-center justify-center px-6 pt-32 pb-12'>
			<div className='w-full max-w-[600px]'>
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY }}
					className='card relative flex flex-col items-center gap-4 p-12 text-center'>
					<h1 className='text-2xl font-bold'>开发中</h1>
					<p className='text-secondary text-base leading-relaxed'>这个页面还没写完，稍后再来。</p>
				</motion.div>
			</div>
		</div>
	)
}
