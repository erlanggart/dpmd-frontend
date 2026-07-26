import PesananTemplate from './templates/PesananTemplate';
import FakturTemplate from './templates/FakturTemplate';
import KwitansiTemplate from './templates/KwitansiTemplate';
import BAPemeriksaanTemplate from './templates/BAPemeriksaanTemplate';
import LampPemeriksaanTemplate from './templates/LampPemeriksaanTemplate';
import BastTemplate from './templates/BastTemplate';
import LampiranBastTemplate from './templates/LampiranBastTemplate';
import BasthpTemplate from './templates/BasthpTemplate';
import Bend35Template from './templates/Bend35Template';
import Bend29Template from './templates/Bend29Template';

/**
 * Registry semua template dokumen pencairan.
 * key   : docKey yang dipakai di DOKUMEN_LIST
 * label : nama tampilan dokumen
 * component : React component template
 * orientation : 'portrait' (default) | 'landscape'
 */
export const TEMPLATE_REGISTRY = {
  pesanan:          { label: 'Surat Pesanan',          component: PesananTemplate,         orientation: 'portrait'  },
  faktur:           { label: 'Faktur',                 component: FakturTemplate,           orientation: 'portrait'  },
  kwitansi:         { label: 'Kwitansi',               component: KwitansiTemplate,         orientation: 'portrait'  },
  ba_pemeriksaan:   { label: 'BA Pemeriksaan',         component: BAPemeriksaanTemplate,    orientation: 'portrait'  },
  lamp_pemeriksaan: { label: 'Lampiran Pemeriksaan',   component: LampPemeriksaanTemplate,  orientation: 'portrait'  },
  bast:             { label: 'BAST',                   component: BastTemplate,             orientation: 'portrait'  },
  lampiran_bast:    { label: 'Lampiran BAST',          component: LampiranBastTemplate,     orientation: 'portrait'  },
  basthp:           { label: 'BASTHP',                 component: BasthpTemplate,           orientation: 'portrait'  },
  bend35:           { label: 'Bend 35',                component: Bend35Template,           orientation: 'portrait'  },
  bend29:           { label: 'Bend 29',                component: Bend29Template,           orientation: 'portrait'  },
};
