# Cà Phê Đường Tàu — Kế hoạch (bản 2, 15/11/2026)

Trải nghiệm 3D "ngồi cà phê phố đường tàu Hà Nội": ngồi ghế nhựa thấp sát đường ray, nghe radio
(Spotify cá nhân), thỉnh thoảng đoàn tàu lướt qua cách bàn vài gang tay.

## 1. Hiện trạng & lỗi đã phát hiện

| # | Vấn đề | Mức độ | Trạng thái |
|---|--------|--------|------------|
| 1 | Nhạc Spotify **tắt khi đóng modal Radio** (iframe nằm trong modal, bị unmount) | Cao | ✅ Sửa ở bản này |
| 2 | Camera trôi dần (rung tàu + "thở" cộng dồn vào vị trí mỗi frame) → sau vài giây dí sát mặt bàn | Cao | ✅ |
| 3 | Đổi góc nhìn (`cameraView`) không có tác dụng — chỉ đặt lúc mount | TB | ✅ |
| 4 | Cửa sổ toa tàu là plane rộng 0.02 → gần như vô hình; tàu là các hộp phẳng | TB | ✅ Dựng lại |
| 5 | Ánh sáng hoàng hôn cháy cam toàn cảnh | TB | ✅ Cân lại |
| 6 | Link Spotify dạng `open.spotify.com/intl-vi/...`, `spotify:playlist:...`, podcast không nhận | TB | ✅ |
| 7 | Không lưu gì giữa các lần mở (âm lượng, thời tiết, playlist) | Thấp | ✅ (đài, playlist cá nhân, âm lượng, thời tiết) |
| 8 | **Các toà nhà xoay sai 90°**: mặt tiền quay về camera, khối nhà trùm lên vỉa hè → bàn và camera nằm *trong* nhà | Cao | ✅ |
| 9 | Màn hình chờ tắt cứng sau 1.2s → màn đen vài giây trên máy yếu | TB | ✅ Tắt khi khung hình 3D đầu tiên vẽ xong |
| 10 | Nút ẩn UI đè lên nút toàn màn hình | Thấp | ✅ |

## 2. Hình ảnh — dựng lại

### Tàu (Train.jsx)
- Đầu máy diesel kiểu Đổi Mới: mũi cabin vát (extrude từ biên dạng bên), kính chắn gió có khung,
  3 đèn pha phát sáng + spotlight, còi trên nóc, quạt tản nhiệt, lan can, biển số vẽ bằng canvas.
- Toa khách: thân extrude từ mặt cắt **mái cong**, sơn kem – sọc xanh – chỉ đỏ, dải cửa sổ có khung
  và ánh đèn vàng bên trong, cửa lên xuống 2 đầu, chữ "ĐƯỜNG SẮT VIỆT NAM" + số toa.
- Giá chuyển hướng có khung, lò xo, **bánh xe quay theo vận tốc**, móc nối + ống xếp nối toa,
  hộp thiết bị gầm toa.
- Geometry/material dùng chung (useMemo) → nhẹ hơn dù chi tiết hơn.

### Chỗ ngồi (CafeTerrace.jsx)
- Thay ghế đẩu gỗ cao bằng **ghế nhựa thấp đỏ / xanh** đặc trưng vỉa hè Hà Nội (lỗ tròn giữa mặt ghế,
  chân vát), bàn gỗ thấp chân sắt gấp.
- Camera hạ xuống tầm mắt người ngồi ghế thấp (~1.1 m), nhìn chéo dọc đường ray.
- Thêm cốc trà đá, giữ phin cà phê + hơi nóng.

### Radio (VintageRadio.jsx)
- Thùng gỗ bo góc, quai xách, chân đồng, mặt loa vải dệt (texture canvas) có nẹp đồng.
- **Mặt số thật**: thang FM 88–108 vẽ canvas, kim đỏ **trượt tới tần số của đài đang phát**.
- Núm vặn có khía, đèn mặt số "thở" khi đang phát, mặt loa rung nhẹ theo nhịp.

### Phố đông như ảnh thật (16/11/2026)
- Phố sinh tự động (seed cố định), mặt tiền cách tim ray 3.3 m, kéo dài tới z = -76 để cuối phố không còn trống.
  Mỗi nhà: cửa hàng sáng đèn có kệ hàng, mái bạt vàng/cam/đỏ, ban công lan can sắt, chậu cây, điều hoà,
  biển hiệu, biển dọc, chữ neon, dây pháo đỏ.
- ~Vài nghìn bóng đèn nháy (1 InstancedMesh, nháy bằng shader): rèm đèn trên mặt tiền, viền mái bạt, lan can,
  dây đèn vắt ngang phố + chùm đèn lồng.
- Dãy bàn ghế nhựa sát ray hai bên, khách ngồi uống cà phê, người đứng mép ray giơ điện thoại quay tàu.
- Nền ray lát đá phiến; đầu máy D19E sơn bạc – tím – vàng – xanh, biển số vàng.
- Gộp hình học (vertex color) → mỗi đoạn phố chỉ 2 draw call; chỉ đoạn gần đổ bóng.

## 3. Âm thanh — Spotify cá nhân

- Dán link cá nhân bất kỳ: playlist / album / track / artist / podcast (show, episode), hỗ trợ
  `intl-xx`, `spotify:` URI, link có `?si=`.
- **"Đài của tôi"**: lưu nhiều link cá nhân (đặt tên, tần số riêng), lưu localStorage, xoá được.
- **Link mặc định qua `.env`**: `VITE_SPOTIFY_URL=https://open.spotify.com/playlist/...`
  → mở app là phát playlist của bạn.
- **Trình phát nổi (dock) luôn mounted**: đóng modal nhạc vẫn chạy; thu gọn / mở rộng được.
- Giới hạn cần biết: Spotify Embed — tài khoản Free nghe preview 30s trừ khi đã đăng nhập Spotify
  trên trình duyệt; muốn điều khiển sâu (volume, next) phải dùng Web Playback SDK (Premium + OAuth)
  → để giai đoạn sau.

## 4. Đề xuất thêm (lộ trình)

### Giai đoạn 2 — Không khí
- [x] Hậu kỳ **Bloom + Vignette + ACES** (`@react-three/postprocessing`): đèn pha, đèn tín hiệu đỏ, cửa sổ toa,
      mặt số radio, đèn lồng toả sáng; độ mạnh theo thời tiết (đêm mạnh nhất). Tắt được trong Cài đặt cho máy yếu.
- [x] **Thời tiết theo giờ Hà Nội thật** (nút "Giờ HN", mặc định bật): 5h15–6h30 bình minh, đến 16h45 nắng,
      đến 18h30 hoàng hôn, sau đó đêm; ban ngày ~18% khung 3 tiếng có mưa phùn. Chọn tay = chuyển sang thủ công.
- [x] **Âm thanh phố tổng hợp** (Web Audio, không file): xe máy chạy ngang (doppler, quét trái→phải), còi bíp,
      chuông xe đạp, tiếng rao xa có vọng ngõ, thìa khuấy ly; đêm có dế + tắc kè; tiếng phin "tách tách" khi đang
      Pomodoro. Mật độ theo thời tiết + giờ Hà Nội (ngày / tối / khuya / mưa). Kênh "Tiếng phố" trong bộ trộn.
      Sửa kèm: âm lượng đã lưu nay được áp dụng khi mở app; đổi sang mưa không còn ghi đè âm lượng mưa.
- [ ] "Ducking": khi tàu qua tự giảm nhạc Spotify qua lớp overlay âm thanh (không chỉnh được volume
      iframe, nhưng có thể tăng tiếng tàu + hiện thông báo).
- [ ] Mưa đọng trên mặt bàn, hơi nước trên kính toa khi trời mưa.

### Giai đoạn 3 — Tính năng
- [x] **Lịch tàu** giả lập theo giờ Hà Nội (SE1–SE20, NA, SP), cố định trong ngày, bảng giờ góc trái +
      đếm ngược; tàu tự chạy đúng giờ (đầu máy qua bàn đúng phút). Chế độ "Như thật" 15–25 phút / "Dày" 4–8 phút,
      bật/tắt tàu tự động. Thay cho tàu ngẫu nhiên 5–10 phút trước đây.
- [x] **Pomodoro "1 phin = 25 phút"**: ly cà phê trong cảnh 3D đầy dần, giọt cà phê rơi từ phin; hết giờ →
      chuông + "Tàu giờ nghỉ" chạy qua → nghỉ 5 phút (15 phút sau mỗi 4 phin). Tạm dừng / huỷ, đếm phin trong ngày,
      đồng hồ hiện trên tiêu đề tab, giữ nguyên khi tải lại trang.
- [ ] Hỗ trợ thêm nguồn nhạc: YouTube / SoundCloud embed.
- [ ] Chế độ chụp ảnh (ẩn UI, chỉnh FOV, xuất PNG).
- [ ] Lưu toàn bộ cài đặt (âm lượng, thời tiết, góc máy).

### Giai đoạn 4 — Hiệu năng & phát hành
- [ ] InstancedMesh cho tà vẹt, cửa sổ, đèn lồng; chế độ "Thấp/Cao" cho máy yếu & điện thoại.
- [ ] Code-split Three.js, nén texture; PWA cài như app.
- [ ] Deploy (Vercel/Netlify) + README tiếng Việt.

## 5. Cấu trúc liên quan

```
src/services/spotify.js          parse link → embed URL
src/stores/useAppStore.js        trạng thái + persist playlist cá nhân
src/components/ui/SpotifyDock.jsx trình phát nổi luôn mounted
src/components/ui/RadioModal.jsx  chọn đài, quản lý "Đài của tôi"
src/components/train/Train.jsx   đầu máy + toa
src/components/environment/CafeTerrace.jsx  bàn ghế nhựa thấp
src/components/radio/VintageRadio.jsx       radio mới
src/components/scene/CameraManager.jsx      camera không trôi, chuyển góc mượt
src/services/trainSchedule.js    lịch tàu theo ngày (seed cố định), đếm ngược
src/components/ui/TimeKeeper.jsx  luôn chạy: phát tàu theo lịch + đồng hồ Pomodoro
src/components/ui/TrainBoard.jsx  bảng giờ tàu
src/components/ui/PomodoroWidget.jsx  phin Pomodoro
src/services/hanoiTime.js        giờ Hà Nội → thời tiết
src/services/streetSounds.js     âm thanh phố tổng hợp
src/components/environment/HanoiStreet.jsx  phố sinh tự động + đèn nháy
src/components/environment/StreetLife.jsx   bàn ghế, khách, người quay phim
src/components/environment/geometryBatch.js gộp hình học nhiều khối thành 1 mesh
src/components/scene/PostEffects.jsx  Bloom + Vignette
```
