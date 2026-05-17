import { Product, Order, Category, BannerSlide, ContactLink, LayoutConfig } from "./types";

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Panjabi', image: 'https://picsum.photos/seed/panjabi/200/200', value: 'Panjabi' },
  { id: '2', name: 'Genji', image: 'https://picsum.photos/seed/genji/200/200', value: 'Genji' },
  { id: '3', name: 'Rumal', image: 'https://picsum.photos/seed/rumal/200/200', value: 'Rumal' },
  { id: '4', name: 'Sari', image: 'https://picsum.photos/seed/sari/200/200', value: 'Sari' },
  { id: '5', name: 'Tupi', image: 'https://picsum.photos/seed/tupi/200/200', value: 'Tupi' }
];

export const INITIAL_BANNER_SLIDES: BannerSlide[] = [];

export const INITIAL_CONTACT_LINKS: ContactLink[] = [
  { id: '1', type: 'number', label: 'Phone', value: '0123456789' }
];

export const INITIAL_CATEGORY_ADS: string[] = [];

export const INITIAL_STORE_LOGO: string = "https://picsum.photos/seed/logo/200/200";

export const INITIAL_HERO_BANNER: string = "https://picsum.photos/seed/hero/1200/400";

export const INITIAL_STATIC_BANNER: string = "https://picsum.photos/seed/static/1200/200";

export const INITIAL_LAYOUT_CONFIG: LayoutConfig = {
  addButtonPosition: { top: "20px", left: "20px" },
  addButtonSize: { width: '3.5rem', height: '3.5rem' },
  showAddButton: true,
  addButtonLabel: "Add Product",
  viewCollectionButtonPosition: { top: "20px", left: "100px" },
  viewCollectionButtonSize: { width: 'auto', height: 'auto' },
  showViewCollectionButton: true,
  viewCollectionButtonLabel: "View Collection",
  widgetPosition: { top: "0px", left: "0px" },
  widgetSize: { width: '320px', height: 'auto' },
  glassEffect: true
};
