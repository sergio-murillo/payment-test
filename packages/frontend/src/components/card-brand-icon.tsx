'use client';

interface CardBrandIconProps {
  brand: 'visa' | 'mastercard' | '';
  size?: number;
}

export function CardBrandIcon({ brand, size = 40 }: CardBrandIconProps) {
  if (brand === 'visa') {
    return (
      <svg
        width={size}
        height={size * 0.65}
        viewBox="0 0 780 500"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Visa"
      >
        <rect width="780" height="500" rx="40" fill="#1A1F71" />
        <path
          d="M293.2 348.7l33.4-195.8h53.4l-33.4 195.8H293.2zm246.8-191c-10.6-4-27.2-8.3-47.9-8.3-52.8 0-90 26.6-90.2 64.7-.3 28.2 26.5 43.9 46.8 53.3 20.8 9.6 27.8 15.8 27.7 24.4-.1 13.2-16.6 19.2-32 19.2-21.4 0-32.7-3-50.3-10.2l-6.9-3.1-7.5 44c12.5 5.5 35.6 10.2 59.5 10.5 56.2 0 92.6-26.3 92.9-67 .2-22.3-14-39.3-44.8-53.3-18.7-9.1-30.1-15.1-30-24.3 0-8.1 9.7-16.8 30.6-16.8 17.4-.3 30.1 3.5 39.9 7.5l4.8 2.3 7.2-42.9h.2zm131.1-4.8h-41.3c-12.8 0-22.4 3.5-28 16.3l-79.4 179.5h56.2s9.2-24.2 11.3-29.5h68.6c1.6 6.9 6.5 29.5 6.5 29.5h49.7l-43.6-195.8zm-65.8 126.5c4.4-11.3 21.4-54.8 21.4-54.8-.3.5 4.4-11.4 7.1-18.8l3.6 17s10.3 47 12.4 56.6h-44.5zM285.5 152.9l-52.3 133.5-5.6-27c-9.7-31.2-39.9-65-73.7-81.9l47.9 171.1 56.6-.1 84.2-195.6h-57.1z"
          fill="#FFFFFF"
        />
        <path
          d="M146.9 152.9H60.6l-.7 4c67.1 16.2 111.5 55.4 129.9 102.5l-18.7-90.1c-3.2-12.4-12.8-16-24.2-16.4z"
          fill="#F9A533"
        />
      </svg>
    );
  }

  if (brand === 'mastercard') {
    return (
      <svg
        width={size}
        height={size * 0.65}
        viewBox="0 0 780 500"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Mastercard"
      >
        <rect width="780" height="500" rx="40" fill="#1A1F2E" />
        <circle cx="310" cy="250" r="150" fill="#EB001B" />
        <circle cx="470" cy="250" r="150" fill="#F79E1B" />
        <path
          d="M390 130.7c-38.2 30.1-62.7 77-62.7 129.3s24.5 99.2 62.7 129.3c38.2-30.1 62.7-77 62.7-129.3s-24.5-99.2-62.7-129.3z"
          fill="#FF5F00"
        />
      </svg>
    );
  }

  return null;
}
