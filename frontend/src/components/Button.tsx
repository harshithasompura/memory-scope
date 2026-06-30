import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

const base = 'rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50'
const variants = {
  primary: 'bg-accent text-white hover:bg-accent/90',
  secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-100',
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className} inline-flex items-center gap-2`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
