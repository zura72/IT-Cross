// web/src/safe-admin.jsx
import React from "react";

/** Komponen Admin dummy/aman:
 *  - Tidak memanggil .map pada data undefined
 *  - Bisa kamu isi nanti kalau memang dibutuhkan
 */
export default function SafeAdmin() {
  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <b>Admin view</b> belum diaktifkan pada build ini.
    </div>
  );
}
