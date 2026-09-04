import {
  generateSocialImage,
  socialImageAlt,
  socialImageContentType,
  socialImageSize,
} from '@/lib/og-image-generator'

export const alt = socialImageAlt
export const size = socialImageSize
export const contentType = socialImageContentType

export default function OpenGraphImage() {
  return generateSocialImage()
}
