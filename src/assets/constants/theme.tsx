import React from 'react';
import {Dimensions} from 'react-native';
const {width, height} = Dimensions.get('screen');

export const COLORS = {
  primary: '#FDBE6F',
  primaryLight: '#FFE8F0',
  secondary: '#612657',
  success: '#18BF29',
  danger: '#E12344',
  warning: '#ffb02c',
  dark: '#2f2f2f',
  light: '#E6E6E6',
  info: '#2B39B9',
  white: '#fff',
  text: '#6A6A6A',
  title: '#000000',
  label: '#8A8A8A',
  input: '#F9F9F9',
  borderColor: '#E3E3E3',
  backgroundColor: '#fff',
};


export const SIZES = {
  fontLg: 16,
  font: 14,
  fontSm: 13,
  fontXs: 12,

  //radius
  radius_sm: 8,
  radius: 12,
  radius_md: 18,

  //space
  padding: 15,
  margin: 15,

  //Font Sizes
  h1: 40,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,

  //App dimensions
  width,
  height,
};

export const FONTS = {
  fontLg: {
    fontSize: SIZES.fontLg,
    color: COLORS.text,
    lineHeight: 20,
    fontFamily: 'RICORDO-Regular',
  },
  font: {
    fontSize: SIZES.font,
    color: COLORS.text,
    lineHeight: 20,
    fontFamily: 'RICORDO-Regular',
  },
  fontSm: {
    fontSize: SIZES.fontSm,
    color: COLORS.text,
    lineHeight: 18,
    fontFamily: 'RICORDO-Regular',
  },
  fontXs: {
    fontSize: SIZES.fontXs,
    color: COLORS.text,
    lineHeight: 14,
    fontFamily: 'RICORDO-Regular',
  },
  h1: {fontSize: SIZES.h1, color: COLORS.title, fontFamily: 'RICORDO-SemiBold'},
  h2: {fontSize: SIZES.h2, color: COLORS.title, fontFamily: 'RICORDO-SemiBold'},
  h3: {fontSize: SIZES.h3, color: COLORS.title, fontFamily: 'RICORDO-SemiBold'},
  h4: {fontSize: SIZES.h4, color: COLORS.title, fontFamily: 'RICORDO-SemiBold'},
  h5: {fontSize: SIZES.h5, color: COLORS.title, fontFamily: 'RICORDO-SemiBold'},
  h6: {fontSize: SIZES.h6, color: COLORS.title, fontFamily: 'RICORDO-SemiBold'},
  fontBold: {fontFamily: 'OpenSans-SemiBold'},
  fontMedium: {fontFamily: 'OpenSans-Medium'},
  PoppinsSemiBold: 'RICORDO-SemiBold',
  PoppinsRegular: 'Poppins-Regular',
  PoppinsBold: 'Poppins-Bold',
  PoppinsMedium: 'Poppins-Medium',
  OpenSansMedium: 'OpenSans-Medium',
  RICORDOSemiBold:'RICORDO-SemiBold',
  RICORDORegular:'RICORDO-Regular',
  RICORDOBold:'RICORDO-Bold',
  QuestrialRegular:'Questrial-Regular',
};

export const IMAGES = {
  splash: {
    bg: require('../images/splash.png'),
  },
  logos: {
    logo: require('../images/logo.png'),
  },
  header: {
    logo: require('../images/header-logo.png'),
    traxlogo:require('../images/Cmstrax.png')
  },
  background: {
    bg: require('../images/background.png'),
  },
  package: {
    packagesnotfound: require('../images/packagesnotfound.png'),
    packagesnotfoundspain:require('../images/SpanishNoPackage.png'),

  },
  delete: require('../images/delete_icon.png'),
  // camera: require('../images/camera_icon2.png'),
  camera: require('../images/camera_icon3.png'),
  barcode: require('../images/barcode-scan.png'),
  close: require('../images/close.png'),
  down_arrow: require('../images/down_arrow.png'),
  barImg: require('../images/barimg.jpg'),
  galImg: require('../images/image.png'),
  check: require('../images/check.png'),
  green$: require('../images/green$.png'),
  unpaidIcon$: require('../images/Unpaid_icon.png'),
  right_yellow_arrow: require('../images/right_yellow_arrow.png'),
  sort: require('../images/sort.png'),
  left_arrow: require('../images/left-arrow.png'),
  card: require('../images/card.png'),
  cash: require('../images/cash.png'),
  add_receipent: require('../images/add_receipent.png'),
  sync: require('../images/sync.png'),
  notepad: require('../images/notepad.png'),
  red_power: require('../images/red_power.png'),
  black_delete: require('../images/black_delete.png'),
  packageIcon: require('../images/packageIcon.png'),
  greenCheck: require('../images/greenCheck.gif'),
  OffLineImg: require('../images/OffLineImg.gif'),
  secure: require('../images/secure.png'),
  // coins: require('../images/coins.png'),
  coins: require('../images/coins2.png'),
  download: require('../images/downLod.png'),
  line:require('../images/Waveline.png'),
  internet:require('../images/internet.png'),
  Nointernet:require('../images/Nointernet.png'),
  Back:require('../images/back.png'),
  Return:require('../images/return.png'),
  ShipPackage:require('../images/shipPackage.png'),
  ShipToShip:require('../images/shipToship.png'), 
  Storage:require('../images/storage.png'), 
  Deposit:require('../images/deposit.png'),
   Refund:require('../images/refund.png'), 
  AddCustomer:require('../images/addCustomer.png'), 
  bgLogo:require('../images/bgLogo.png'), 
  select:require('../images/selectRadio.png'), 
  unSelect:require('../images/unselectRadio.png'), 
  downloadForm:require('../images/download.png'), 
  Ocr:require('../images/ocr.png'), 
  US:require('../images/us.png'),
  Spain:require('../images/spain.png')

};

export const VIDEOS = {
  splashvideo: {
    bg: require('../videos/splashvideo.mp4'),
  },
};

export const ICONS = {
  header: {
    menu: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><g id="Group_68998" data-name="Group 68998" transform="translate(-324 -61)"><rect id="Rectangle_439" data-name="Rectangle 439" width="6" height="6" rx="3" transform="translate(324 61)" fill="#919191"/><rect id="Rectangle_440" data-name="Rectangle 440" width="6" height="6" rx="3" transform="translate(334 61)" fill="#919191"/><rect id="Rectangle_441" data-name="Rectangle 441" width="6" height="6" rx="3" transform="translate(324 71)" fill="#919191"/><rect id="Rectangle_442" data-name="Rectangle 442" width="6" height="6" rx="3" transform="translate(334 71)" fill="#919191"/></g></svg>`,
    search: `<svg id="Huge-icon_interface_outline_search_01" data-name="Huge-icon/interface/outline/search 01" xmlns="http://www.w3.org/2000/svg" width="21.5" height="21.5" viewBox="0 0 21.5 21.5"><path id="Vector" d="M20.22,21.28A.75.75,0,1,0,21.28,20.22ZM19.28,18.22A.75.75,0,1,0,18.22,19.28ZM1.5,10.25A8.75,8.75,0,0,1,10.25,1.5V0A10.25,10.25,0,0,0,0,10.25ZM10.25,1.5A8.75,8.75,0,0,1,19,10.25h1.5A10.25,10.25,0,0,0,10.25,0ZM19,10.25A8.75,8.75,0,0,1,10.25,19v1.5A10.25,10.25,0,0,0,20.5,10.25ZM10.25,19A8.75,8.75,0,0,1,1.5,10.25H0A10.25,10.25,0,0,0,10.25,20.5Zm11.03,1.22-2-2L18.22,19.28l2,2Z" fill="#919191"/></svg>`,
    cross: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16 8L8 16M8.00001 8L16 16" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`,
    scan: `<svg id="Huge-icon_smart_house_bulk_barcode" data-name="Huge-icon/smart house/bulk/barcode" xmlns="http://www.w3.org/2000/svg" width="21.5" height="21.5" viewBox="0 0 21.5 21.5"><g id="barcode"><path id="Vector_1417_Stroke_" data-name="Vector 1417 (Stroke)" d="M4.75,1.5A3.25,3.25,0,0,0,1.5,4.75v2a.75.75,0,0,1-1.5,0v-2A4.75,4.75,0,0,1,4.75,0h2a.75.75,0,0,1,0,1.5ZM14,.75A.75.75,0,0,1,14.75,0h2A4.75,4.75,0,0,1,21.5,4.75v2a.75.75,0,0,1-1.5,0v-2A3.25,3.25,0,0,0,16.75,1.5h-2A.75.75,0,0,1,14,.75ZM.75,13.944a.75.75,0,0,1,.75.75V16.75A3.25,3.25,0,0,0,4.75,20h2a.75.75,0,0,1,0,1.5h-2A4.75,4.75,0,0,1,0,16.75V14.694A.75.75,0,0,1,.75,13.944Zm20,0a.75.75,0,0,1,.75.75V16.75a4.75,4.75,0,0,1-4.75,4.75h-2a.75.75,0,0,1,0-1.5h2A3.25,3.25,0,0,0,20,16.75V14.694A.75.75,0,0,1,20.75,13.944Z" fill="#28303f" fill-rule="evenodd"/><path id="Vector_1418_Stroke_" data-name="Vector 1418 (Stroke)" d="M0,.75A.75.75,0,0,1,.75,0h10a.75.75,0,0,1,0,1.5H.75A.75.75,0,0,1,0,.75Z" transform="translate(5 10)" fill="red" opacity="0.4"/><path id="Vector_1421_Stroke_" data-name="Vector 1421 (Stroke)" d="M.75,0A.75.75,0,0,1,1.5.75v2a.75.75,0,0,1-1.5,0v-2A.75.75,0,0,1,.75,0Z" transform="translate(14 5.5)" fill="#28303f" opacity="0.4"/><path id="Vector_1425_Stroke_" data-name="Vector 1425 (Stroke)" d="M.75,0A.75.75,0,0,1,1.5.75v2a.75.75,0,0,1-1.5,0v-2A.75.75,0,0,1,.75,0Z" transform="translate(10 5.5)" fill="#28303f" opacity="0.4"/><path id="Vector_1426_Stroke_" data-name="Vector 1426 (Stroke)" d="M.75,0A.75.75,0,0,1,1.5.75v2a.75.75,0,0,1-1.5,0v-2A.75.75,0,0,1,.75,0Z" transform="translate(6 5.5)" fill="#28303f" opacity="0.4"/><path id="Vector_1423_Stroke_" data-name="Vector 1423 (Stroke)" d="M.75,0A.75.75,0,0,1,1.5.75v2a.75.75,0,0,1-1.5,0v-2A.75.75,0,0,1,.75,0Z" transform="translate(10 12.5)" fill="#28303f" opacity="0.4"/><path id="Vector_1427_Stroke_" data-name="Vector 1427 (Stroke)" d="M.75,0A.75.75,0,0,1,1.5.75v2a.75.75,0,0,1-1.5,0v-2A.75.75,0,0,1,.75,0Z" transform="translate(14 12.5)" fill="#28303f" opacity="0.4"/><path id="Vector_1428_Stroke_" data-name="Vector 1428 (Stroke)" d="M.75,0A.75.75,0,0,1,1.5.75v2a.75.75,0,0,1-1.5,0v-2A.75.75,0,0,1,.75,0Z" transform="translate(6 12.5)" fill="#28303f" opacity="0.4"/></g></svg>`,
    wave: `<svg id="Group_69085" data-name="Group 69085" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="66.808" height="35.069" viewBox="0 0 66.808 35.069"><defs><clipPath id="clip-path"><rect id="Rectangle_3533" data-name="Rectangle 3533" width="66.808" height="35.069" fill="none"/></clipPath></defs><g id="Group_69084" data-name="Group 69084" clip-path="url(#clip-path)"><path id="Path_59344" data-name="Path 59344" d="M35.1,34.871a.6.6,0,0,1-.512-.288c-3.7-6.108-1.93-14.151,4.5-20.492a11.013,11.013,0,0,1,9.685-3.252A9.358,9.358,0,0,1,55.691,15.9a5.758,5.758,0,0,1-.455,5.844,6.622,6.622,0,0,1-1.94,1.9,7.17,7.17,0,0,0,6.216-3.47c2.195-3.325,2.656-9.3-3.267-15.2C55.475,4.2,48.417-2.361,38,3.5a25.956,25.956,0,0,0-9.5,10.03,108.227,108.227,0,0,0-5.858,12.623l-.121.292c-2.006,4.86-4.683,6.441-6.574,6.912a5.252,5.252,0,0,1-4.579-.836,3.646,3.646,0,0,1-.646-4.109,3.223,3.223,0,0,1,3.156-1.831,4.471,4.471,0,0,0-3.384-2.75C4.4,23.28,2.32,30.265,1.321,33.621l-.153.511a.6.6,0,0,1-1.143-.347l.151-.5C1.181,29.906,3.533,22,10.6,22.644c2.483.225,4.2,2.479,4.741,4.478a.6.6,0,0,1-.69.743c-1.409-.272-2.4.094-2.851,1.059a2.488,2.488,0,0,0,.327,2.679,4.1,4.1,0,0,0,3.529.6c1.625-.4,3.943-1.81,5.759-6.209l.12-.292a109.124,109.124,0,0,1,5.926-12.762A27.122,27.122,0,0,1,37.414,2.461c11.183-6.294,18.838.827,19.674,1.66,6.434,6.409,5.864,13,3.421,16.7-2.268,3.435-6.26,4.862-9.709,3.471a.6.6,0,0,1,.256-1.15,4.258,4.258,0,0,0,3.188-2.071,4.6,4.6,0,0,0,.366-4.667,8.164,8.164,0,0,0-6.044-4.393,9.709,9.709,0,0,0-8.637,2.926c-4.791,4.726-8.441,12.205-4.315,19.024a.6.6,0,0,1-.51.906Z" transform="translate(0.001 0.094)" fill="#0091d0"/><path id="Path_59345" data-name="Path 59345" d="M226.581,127.19a.6.6,0,0,1-.19-.031c-4.52-1.52-6.13-4.346-6.684-6.449a10.407,10.407,0,0,1,2.439-9.313.6.6,0,0,1,.89.8,9.186,9.186,0,0,0-2.173,8.211c.688,2.609,2.732,4.553,5.91,5.622a.6.6,0,0,1-.19,1.163Z" transform="translate(-181.98 -92.225)" fill="#0091d0"/><path id="Path_59346" data-name="Path 59346" d="M264.18,150.7a22.992,22.992,0,0,1-11.862-3.074c-3.107-2-4.512-4.656-4.063-7.686a.6.6,0,1,1,1.182.175c-.474,3.2,1.657,5.3,3.528,6.507,5.108,3.285,14.571,3.875,18.75,1.169a.6.6,0,1,1,.649,1A15.58,15.58,0,0,1,264.18,150.7Z" transform="translate(-205.828 -115.638)" fill="#0091d0"/></g></svg>`,
  },
  search: {
    filter: `<svg id="Huge-icon_interface_outline_filter" data-name="Huge-icon/interface/outline/filter" xmlns="http://www.w3.org/2000/svg" width="19.505" height="21.5" viewBox="0 0 19.505 21.5"><path id="Vector_309" data-name="Vector 309" d="M18.383,4.1l.6.456.026-.036Zm-5.722,7.482-.6-.456-.026.036Zm-1.05,6.7.527.534h0ZM9.434,20.433,8.907,19.9h0Zm-2.59-8.855.622-.419-.026-.036ZM1.122,4.1.5,4.515l.026.036ZM2.934,1.5H16.571V0H2.934ZM17.788,3.64l-5.722,7.482,1.191.911,5.722-7.482ZM11.18,13.965V17.52h1.5V13.965Zm-.1,3.782L8.907,19.9l1.054,1.067,2.177-2.152ZM8.325,19.672V13.965h-1.5v5.707Zm-.886-8.55L1.718,3.64.526,4.551l5.722,7.482Zm.886,2.843a5.018,5.018,0,0,0-.86-2.807L6.222,12a3.518,3.518,0,0,1,.6,1.968ZM8.907,19.9a.341.341,0,0,1-.581-.227h-1.5a1.84,1.84,0,0,0,3.136,1.294ZM11.18,17.52a.319.319,0,0,1-.1.227l1.054,1.067a1.819,1.819,0,0,0,.542-1.294Zm.86-6.362a5.018,5.018,0,0,0-.86,2.807h1.5a3.518,3.518,0,0,1,.6-1.968ZM16.571,1.5a1.4,1.4,0,0,1,1.19,2.176l1.243.839A2.9,2.9,0,0,0,16.571,0ZM2.934,0A2.9,2.9,0,0,0,.5,4.515l1.244-.839A1.4,1.4,0,0,1,2.934,1.5Z" transform="translate(0)" fill="#28303f"/></svg>`,
    sort: `<svg id="Huge-icon_interface_outline_sort-arrow-down_01" data-name="Huge-icon/interface/outline/sort-arrow-down 01" xmlns="http://www.w3.org/2000/svg" width="19.5" height="13.5" viewBox="0 0 19.5 13.5"><path id="Vector" d="M9.75,0a.75.75,0,0,0,0,1.5Zm9,1.5a.75.75,0,0,0,0-1.5ZM9.75,6a.75.75,0,0,0,0,1.5Zm6,1.5a.75.75,0,0,0,0-1.5Zm-6,4.5a.75.75,0,0,0,0,1.5Zm3,1.5a.75.75,0,0,0,0-1.5ZM1.311,9.877a.75.75,0,1,0-1.121,1Zm.945,2.192-.561.5h0Zm2.99,0,.561.5h0Zm2.066-1.2a.75.75,0,1,0-1.121-1ZM3,12.75a.75.75,0,0,0,1.5,0ZM4.5.75A.75.75,0,0,0,3,.75Zm5.25.75h9V0h-9Zm0,6h6V6h-6Zm0,6h3V12h-3ZM.189,10.873l1.505,1.693,1.121-1L1.311,9.877Zm5.616,1.693,1.505-1.693-1.121-1L4.684,11.57Zm-4.111,0a2.75,2.75,0,0,0,4.111,0l-1.121-1a1.25,1.25,0,0,1-1.869,0ZM4.5,12.75V.75H3v12Z" transform="translate(0)" fill="#28303f"/></svg>`,
  },
};

export const SOUNDS = {
  scanner: {
    beep: '../sounds/scanner_beep.mp3',
  },
};

const appTheme = {COLORS, SIZES, FONTS, IMAGES};

export default appTheme;
