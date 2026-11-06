// Site-wide constants.
export const SITE = {
  name: 'Chemputer',
  /** The public brand in titles and search results ("Chemputer" alone is also a Glasgow robotics project). */
  brand: 'Chemputer Studio',
  alternateNames: ['Chemputer', 'Chemputer বাংলা', 'কেমপিউটার', 'Chemputer Bangla'],
  tagline: 'Chemistry made simple',
  url: 'https://chemputer-educational-webapps.vercel.app',
  author: 'ইউশা খান',
  authorEn: 'Md. Usha Khan',
  youtube: 'https://www.youtube.com/@ChemputerStudio',
  facebook: 'https://www.facebook.com/usha.khan.50596',
  repo: 'https://github.com/Usha0070/Chemputer-Educational-Webapps',
  year: '২০২৬',
  description:
    'নবম-দশম শ্রেণির রসায়ন চোখে দেখে শেখো: ইন্টারেক্টিভ রসায়ন সিমুলেশন, অ্যানিমেশন ও ভার্চুয়াল ল্যাব, NCTB বইয়ের অধ্যায় অনুযায়ী। Free SSC chemistry simulations and animations in Bangla.',
  /** Search engine ownership codes (Search Console → HTML tag, Bing Webmaster → meta tag). Empty = not rendered. */
  verification: { google: 'TgflAoBa6zT7IdX0fX_K2mZV3CQ8E8gxlVzcMDQSfT0', bing: '' },
} as const;

export const LEVELS = {
  ssc: { titleBn: 'নবম-দশম শ্রেণি', short: 'ক্লাস ৯–১০', titleEn: 'SSC · Class 9–10', path: '/ssc/' },
} as const;
