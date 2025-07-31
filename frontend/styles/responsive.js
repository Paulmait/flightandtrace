import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const isTablet = width >= 768 && width < 1200;
export const isDesktop = width >= 1200;
export const isMobile = width < 768;

export function responsiveSize(small, medium, large) {
  if (isDesktop) return large;
  if (isTablet) return medium;
  return small;
}

export function responsivePadding() {
  if (isDesktop) return 48;
  if (isTablet) return 32;
  return 16;
}

export function responsiveModalWidth() {
  if (isDesktop) return 600;
  if (isTablet) return 400;
  return '90%';
}
