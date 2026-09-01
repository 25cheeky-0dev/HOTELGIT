export interface JwtPayload {
  sub: number;
  username: string;
  role: 'owner' | 'manager' | 'kitchen';
  iat?: number;
  exp?: number;
}

export interface OrderInputItem {
  menu_item_id: number;
  quantity: number;
  note?: string;
}

export interface CreateOrderInput {
  table_id: number;
  items: OrderInputItem[];
  customer_notes?: string;
}

export interface StatusUpdateInput {
  status: string;
}

export interface CategoryInput {
  name: string;
  display_order?: number;
  is_active?: boolean;
}

export interface MenuItemInput {
  category_id?: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available?: boolean;
  is_veg?: boolean;
  spice_level?: number;
  prep_time_min?: number;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface SettingInput {
  key: string;
  value: string;
}

export type PeriodType = 'today' | 'week' | 'month';
