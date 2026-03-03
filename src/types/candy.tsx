
export type CandyTypeName = 'gummy' | 'chocolate' | 'hard_candy' | 'sour' | 'chewy' | 'fruity';

export type CandySize = 'small' | 'medium' | 'big';

export type Candy = {
  name: string;
  baseMin: number;
  baseMax: number;
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
  types: [CandyTypeName, CandyTypeName];
  size: CandySize;
};
