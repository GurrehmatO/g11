'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NavButton({ href, children, pendingText, ...props }: any) {
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()
  return (
    <button 
      {...props}
      disabled={isNavigating || props.disabled}
      style={{ 
        ...props.style, 
        opacity: isNavigating ? 0.7 : 1, 
        cursor: isNavigating ? 'wait' : 'pointer' 
      }}
      onClick={(e) => {
        e.preventDefault()
        setIsNavigating(true)
        if (props.onClick) props.onClick(e)
        router.push(href)
      }}
    >
      {isNavigating ? (pendingText || 'Loading...') : children}
    </button>
  )
}
