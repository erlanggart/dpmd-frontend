/**
 * Cluster titik sebaran untuk ratusan ribu titik.
 *
 * `ol/source/Cluster` menghitung ulang SELURUH titik setiap kali zoom berubah,
 * termasuk yang jauh di luar layar. Saat data masih ribuan titik itu tidak
 * terasa; pada ±190 ribu titik, zoom 16–18 terukur 1,3–1,8 detik di desktop
 * (dan berkali lipat di tablet) untuk membuat ±180 ribu cluster yang sebagian
 * besar tidak akan pernah tergambar.
 *
 * Di sini yang dihitung hanya titik di sekitar layar. Selama seluruh titik masih
 * tercakup (tampilan satu kabupaten) perhitungannya sama persis dengan aslinya,
 * jadi angka cluster di tampilan awal tetap sepadan dengan panel super admin.
 */

import Cluster from 'ol/source/Cluster';
import { buffer, containsExtent, createEmpty, createOrUpdateFromCoordinate, getHeight, getWidth } from 'ol/extent';
import { getUid } from 'ol/util';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';

export class ClusterHemat extends Cluster {
  loadFeatures(extent, resolution, projection) {
    this.source.loadFeatures(extent, resolution, projection);
    if (resolution === this.resolution && this.cakupan && containsExtent(this.cakupan, extent)) return;
    this.resolution = resolution;
    // Dilebihkan satu layar ke tiap sisi: menggeser peta sedikit tidak perlu
    // memicu penghitungan ulang.
    this.cakupan = buffer(extent, Math.max(getWidth(extent), getHeight(extent)));
    this.refresh();
  }

  /** Salinan `Cluster.cluster()`; bedanya hanya pada baris pengambil `features`. */
  cluster() {
    if (this.resolution === undefined || !this.source) return;

    const extent = createEmpty();
    const mapDistance = this.distance * this.resolution;
    const semuaTercakup = !this.cakupan || containsExtent(this.cakupan, this.source.getExtent());
    const features = semuaTercakup ? this.source.getFeatures() : this.source.getFeaturesInExtent(this.cakupan);
    const clustered = {};

    for (let i = 0; i < features.length; i += 1) {
      const feature = features[i];
      if (getUid(feature) in clustered) continue;
      const geometry = this.geometryFunction(feature);
      if (!geometry) continue;

      createOrUpdateFromCoordinate(geometry.getCoordinates(), extent);
      buffer(extent, mapDistance, extent);

      const neighbors = this.source.getFeaturesInExtent(extent).filter((neighbor) => {
        const uid = getUid(neighbor);
        if (uid in clustered) return false;
        clustered[uid] = true;
        return true;
      });
      this.features.push(this.createCluster(neighbors, extent));
    }
  }
}

/**
 * `getClusterForFeature` bawaan ol-ext menyusuri seluruh anggota seluruh cluster
 * untuk tiap cluster yang dianimasikan: pada zoom menengah itu ratusan juta
 * perbandingan setiap ganti zoom. Satu indeks per daftar cluster memberi jawaban
 * yang sama, karena satu titik hanya pernah menjadi anggota satu cluster.
 */
export class LayerClusterHemat extends AnimatedCluster {
  getClusterForFeature(fitur, daftarCluster) {
    if (this.daftarTerindeks !== daftarCluster) {
      this.daftarTerindeks = daftarCluster;
      this.indeksCluster = new Map();
      daftarCluster.forEach((c) => {
        (c.get('features') || []).forEach((f) => this.indeksCluster.set(f, c));
      });
    }
    return this.indeksCluster.get(fitur) || false;
  }
}
