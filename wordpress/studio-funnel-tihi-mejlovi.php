<?php
/**
 * Plugin Name: Studio Reel Lab: bez Woo mejlova za porudžbine iz funnela
 * Description: Porudžbine koje pravi studio.aiprofit.rs (meta studio_funnel = 1) su samo evidencija. Kupac već dobija mejl iz funnela, pa Woo ne šalje svoje. Sve ostale porudžbine na sajtu rade kao i do sada.
 *
 * Instalacija (jedno od dva):
 *  - plugin "Code Snippets" → Add New → nalepi sve ispod <?php reda → "Run everywhere" → Activate
 *  - ili ovaj fajl u wp-content/mu-plugins/ (radi sam, ne može slučajno da se isključi)
 */

$studio_funnel_mejlovi = [
	'customer_processing_order',
	'customer_completed_order',
	'customer_on_hold_order',
	'customer_invoice',
	'customer_note',
	'customer_refunded_order',
	'customer_cancelled_order',
	'customer_failed_order',
	// Admin obaveštenje "New order" za Studio kupovine. Obriši // ispred reda ako ne želiš ni njega:
	// 'new_order',
];

foreach ( $studio_funnel_mejlovi as $studio_funnel_mejl ) {
	add_filter(
		"woocommerce_email_enabled_{$studio_funnel_mejl}",
		function ( $enabled, $order ) {
			if ( $order instanceof WC_Order && '1' === (string) $order->get_meta( 'studio_funnel' ) ) {
				return false;
			}
			return $enabled;
		},
		10,
		2
	);
}
