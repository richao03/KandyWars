import { CandyTypeName, CandySize } from '../src/types/candy';

export interface Candy {
  name: string;
  baseMin: number;
  baseMax: number;
  basePrice?: number;
  cost?: number;
  types: [CandyTypeName, CandyTypeName];
  size: CandySize;
}

export interface CandyType {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}
