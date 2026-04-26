import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  gameSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Game Data',
      items: ['game-data/jokers', 'game-data/hall-passes', 'game-data/candy'],
    },
    {
      type: 'category',
      label: 'Mechanics',
      items: [
        'mechanics/sale-formula',
        'mechanics/economy',
        'mechanics/sale-tiers',
      ],
    },
  ],
};

export default sidebars;
