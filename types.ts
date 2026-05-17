export interface LayoutConfig {
  addButtonPosition: { top: string; left: string };
  addButtonSize: { width: string; height: string };
  showAddButton: boolean;
  addButtonLabel: string;
  addButtonIcon?: string;
  viewCollectionButtonPosition: { top: string; left: string };
  viewCollectionButtonSize: { width: string; height: string };
  showViewCollectionButton: boolean;
  viewCollectionButtonLabel: string;
  viewCollectionButtonIcon?: string;
  widgetPosition: { top: string; left: string };
  widgetSize: { width: string; height: string };
  glassEffect: boolean;
}

export interface BannerSlide {
  id: string;
  image: string;
  duration: number;
  productName: string;
  productLink: string;
}

export interface Product {
  id: number;
  name: string;
  nameBn?: string;
  price: number;
  category: 'Panjabi' | 'Genji' | 'Rumal' | 'Sari' | 'Tupi' | string;
  subCategory?: string;
  image: string;
  images?: string[];
  description: string;
  descriptionBn?: string;
  couponCode?: string;
  relatedProductIds?: number[];
  productCode?: number;
  inventoryCode?: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  amount: number;
  status: 'Pending' | 'Processing' | 'Packaging' | 'Delivering' | 'Delivered' | 'Cancelled';
  date: string;
  items?: string;
  city?: string;
  note?: string;
  paymentMethod?: 'Cash on Delivery' | 'Bkash' | 'Nagad' | 'Rocket';
  transactionId?: string;
  courierService?: string;
}

export type CategoryAd = string;

export interface Category {
  id: string;
  name: string;
  image: string;
  value: string;
  subCategories?: string[];
}

export interface ContactLink {
  id: string;
  type: 'link' | 'number' | 'email' | 'courier';
  label: string;
  value: string;
}
