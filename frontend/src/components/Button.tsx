import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

const base =
  'inline-flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-sm font-medium transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed'
const variants = {
  primary: 'bg-ink text-paper hover:-translate-y-0.5',
  secondary: 'border border-ink/15 text-ink/70 hover:border-ink/40 hover:text-ink',
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
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
