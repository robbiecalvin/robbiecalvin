<?php
/**
 * Plugin Name: Robbie Calvin Quick License Bridge
 * Description: Issues Quick License keys for paid portfolio subscriptions in a sandbox.
 * Version: 0.1.0
 */

if (! defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', static function () {
    register_rest_route('rc-quick-license/v1', '/entitlement', array(
        'methods' => 'POST',
        'permission_callback' => static function ($request) {
            $token = defined('RC_QL_BRIDGE_TOKEN') ? RC_QL_BRIDGE_TOKEN : '';
            $authorization = $request->get_header('authorization');
            return wp_get_environment_type() !== 'production'
                && is_ssl()
                && is_string($token)
                && strlen($token) >= 32
                && is_string($authorization)
                && hash_equals('Bearer ' . $token, $authorization);
        },
        'callback' => 'rc_ql_provision_entitlement',
    ));
});

function rc_ql_provision_entitlement($request)
{
    global $wpdb;
    $seed = defined('RC_QL_BRIDGE_KEY_SEED') ? RC_QL_BRIDGE_KEY_SEED : '';
    if (! class_exists('QLIC_License_Generator') || ! is_string($seed) || strlen($seed) < 32) {
        return new WP_Error('issuer_unavailable', 'Quick License issuer is unavailable.', array('status' => 503));
    }

    $body = $request->get_json_params();
    $subscription = $body['subscription_id'] ?? null;
    $email = $body['email'] ?? null;
    $slug = $body['product_slug'] ?? null;
    $limit = $body['site_limit'] ?? null;
    $expiry = $body['paid_through'] ?? null;
    if (! is_string($subscription) || ! preg_match('/\Asub_[A-Za-z0-9]{1,100}\z/', $subscription)
        || ! is_string($email) || strlen($email) > 190 || ! is_email($email)
        || ! is_string($slug) || ! preg_match('/\A[a-z0-9-]{1,100}\z/', $slug)
        || ! in_array($limit, array(1, 5, 10, 25), true)
        || ! is_int($expiry) || $expiry <= time() || $expiry > time() + 370 * DAY_IN_SECONDS) {
        return new WP_Error('invalid_entitlement', 'Invalid entitlement.', array('status' => 400));
    }

    // Bind the key to the subscription and product. A retry or renewal keeps existing activations.
    $key = QLIC_License_Generator::canonicalize(strtoupper(substr(
        hash_hmac('sha256', 'sandbox:' . $subscription . ':' . $slug, $seed),
        0,
        32
    )));
    $expires_at = wp_date('Y-m-d H:i:s', $expiry);
    $table = $wpdb->prefix . 'quick_licenses';
    $previous_suppression = $wpdb->suppress_errors(true);
    try {
        $result = $wpdb->query($wpdb->prepare(
            "INSERT INTO {$table} (product_slug, license_key, customer_email, activation_limit, status, expires_at, created_at)
             VALUES (%s, %s, %s, %d, 'active', %s, %s)
             ON DUPLICATE KEY UPDATE expires_at = IF(
                 product_slug = VALUES(product_slug) AND customer_email = VALUES(customer_email)
                 AND activation_limit = VALUES(activation_limit) AND status = 'active' AND expires_at IS NOT NULL,
                 GREATEST(expires_at, VALUES(expires_at)), expires_at
             )",
            $slug,
            $key,
            $email,
            $limit,
            $expires_at,
            current_time('mysql')
        ));
        if ($result === false) {
            return new WP_Error('issuer_unavailable', 'Quick License issuer is unavailable.', array('status' => 503));
        }
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT product_slug, customer_email, activation_limit, status, expires_at FROM {$table} WHERE license_key = %s",
            $key
        ));
    } finally {
        $wpdb->suppress_errors($previous_suppression);
    }

    if (! $row || $row->product_slug !== $slug || $row->customer_email !== $email
        || (int) $row->activation_limit !== $limit || $row->status !== 'active'
        || $row->expires_at === null || strcmp($row->expires_at, $expires_at) < 0) {
        return new WP_Error('entitlement_conflict', 'Entitlement could not be provisioned.', array('status' => 409));
    }

    return new WP_REST_Response(array('license_key' => $key, 'product_slug' => $slug), 200, array(
        'Cache-Control' => 'no-store',
    ));
}
