import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import path from 'path';

const config: Config = {
  title: 'SugarWars Wiki',
  tagline: 'Game reference for jokers, hall passes, candy, and mechanics',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://sugarwars.example.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Allow importing from the parent project's src/ directory
  plugins: [
    function aliasPlugin() {
      return {
        name: 'alias-plugin',
        configureWebpack() {
          return {
            resolve: {
              alias: {
                '@game': path.resolve(__dirname, '..', 'src'),
                '@utils': path.resolve(__dirname, '..', 'utils'),
              },
            },
          };
        },
      };
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Serve docs at root
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'SugarWars Wiki',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'gameSidebar',
          position: 'left',
          label: 'Game Reference',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `SugarWars Game Wiki — Built with Docusaurus`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
