import React from 'react';
import DesaBankeuLpjPage from '../bankeu/DesaBankeuLpjPage';

const DesaBantuanProvinsiLpjPage = () => (
  <DesaBankeuLpjPage
    tahun={2026}
    programName="Bantuan Provinsi"
    endpointBase="/desa/bantuan-provinsi-lpj"
    storageBase="/storage/uploads/bantuan_provinsi_lpj"
    referenceType="bantuan_provinsi_lpj"
    chatTitle="Chat LPJ Bantuan Provinsi"
  />
);

export default DesaBantuanProvinsiLpjPage;
