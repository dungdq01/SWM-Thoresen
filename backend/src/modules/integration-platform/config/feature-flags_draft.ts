/**
 * [DRAFT] Feature Flags cho Module 8 Integration Platform
 *
 * ⚠️ FILE TẠM THỜI - Dùng để bật/tắt các tính năng thử nghiệm
 *
 * Cách sử dụng:
 * - Đặt flag = false để tắt tính năng mà không cần xóa code
 * - Có thể chuyển sang env variable sau này
 *
 * @author Cascade AI
 * @since 2026-03-16
 * @status DRAFT
 */

export const FEATURES = {
  /**
   * [DRAFT] Tự động sync trạng thái từ M8 Weighbridge sang M4 Inbound
   *
   * Khi bật (true):
   * - Confirm weigh log → Cập nhật Receipt status sang WEIGHED_IN
   *
   * Khi tắt (false):
   * - Không có side effect sang M4
   * - M8 hoạt động độc lập
   *
   * ⚠️ Logic chưa xác nhận với khách hàng
   */
  M8_M4_AUTO_SYNC: true,

  /**
   * [DRAFT] Log chi tiết cho cross-module operations
   */
  M8_M4_VERBOSE_LOGGING: true,
};

/**
 * Helper để check feature flag
 */
export function isFeatureEnabled(featureName: keyof typeof FEATURES): boolean {
  return FEATURES[featureName] === true;
}
