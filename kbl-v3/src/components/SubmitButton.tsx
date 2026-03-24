'use client'
import { useFormStatus } from 'react-dom'

export function SubmitButton({ children, pendingText, ...props }: any) {
  const { pending } = useFormStatus()
  return (
    <button 
      {...props} 
      disabled={pending || props.disabled} 
      style={{ 
        ...props.style, 
        opacity: pending ? 0.7 : 1, 
        cursor: pending ? 'not-allowed' : 'pointer' 
      }}
    >
      {pending ? (pendingText || 'Loading...') : children}
    </button>
  )
}
