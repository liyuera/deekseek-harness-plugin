/** Bookmark glyphs for the strip; ui-primitives ships no bookmark shape. */
import type { IconProps } from '@deepseek-ai/dsh-client-ui-primitives'

/** Hollow bookmark: this message is not saved. */
export const IconBookmarkOutline16 = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 1.75h8c.69 0 1.25.56 1.25 1.25v11.2c0 .52-.6.8-1 .48L8 11.4l-4.25 3.28c-.4.31-1 .04-1-.48V3c0-.69.56-1.25 1.25-1.25Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
)

/** Solid bookmark: this message is saved. */
export const IconBookmarkFill16 = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 1.75h8c.69 0 1.25.56 1.25 1.25v11.2c0 .52-.6.8-1 .48L8 11.4l-4.25 3.28c-.4.31-1 .04-1-.48V3c0-.69.56-1.25 1.25-1.25Z"
      fill="currentColor"
    />
  </svg>
)
