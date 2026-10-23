<?php
/*
 * Finverse runtime configuration example.
 *
 * For production, copy this file to the directory ABOVE the public web root
 * and rename it to finverse-config.php. Never commit the real file.
 */

return [
    // Trial request delivery
    'recipient' => 'hello@example.com',
    'web3forms_key' => '',
    'formsubmit_id' => '',
    'sender' => 'Finverse <noreply@mjvii.com>',
    'envelope' => 'noreply@mjvii.com',

    // First-party analytics
    'analytics_salt' => 'replace-with-a-long-random-secret',
    'trust_proxy' => false,
];
