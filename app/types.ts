export interface Candy {
  name: string;
  baseMin: number;
  baseMax: number;
  basePrice?: number;
  cost?: number;
}

export interface CandyType {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}