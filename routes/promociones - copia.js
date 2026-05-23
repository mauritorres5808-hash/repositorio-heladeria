const express = require('express');
const router = express.Router();

const db = require('../db');

// ==========================================
// CALCULAR PROMOCIONES
// ==========================================
router.post('/calcular', async (req, res) => {

    try {
        const { productos } = req.body;

        let subtotalOriginal = 0;
        let descuentoPromos = 0;
        let promocionesAplicadas = [];

        // ==========================================
        // SUBTOTAL ORIGINAL
        // ==========================================
        productos.forEach(p => {
            subtotalOriginal += Number(p.precio) * Number(p.cantidad);
        });

        // ==========================================
        // RECORRER PRODUCTOS
        // ==========================================
        for (const p of productos) {
            // PROMOS DEL PRODUCTO
            const [promos] = await db.query(`
                SELECT
                    pr.*
                FROM promociones pr
                INNER JOIN rela_promo_productos rp
                    ON rp.id_promocion = pr.id_promocion
                WHERE
                    rp.id_producto = ?
                    AND pr.activa = 1
            `, [p.id]);

            // ======================================
            // EVALUAR PROMOS
            // ======================================
            for (const promo of promos) {
                // ==================================
                // SEGUNDA UNIDAD AL 50%
                // ==================================
                if (promo.tipo === 'SEGUNDA_UNIDAD') {
                    const pares = Math.floor(p.cantidad / 2);

                    if (pares > 0) {
                        const descuento = pares * (p.precio * 0.5);

                        descuentoPromos += descuento;

                        promocionesAplicadas.push({
                            id_promocion: promo.id_promocion,
                            descripcion: promo.descripcion,
                            descuento
                        });
                    }
                }

                // ==================================
                // 2x1 - 3x2 - 6x4 - etc
                // ==================================
				if (promo.tipo === 'LLEVA_PAGA') {
					const llevaCant = Number(promo.lleva_cant || 0);
					const pagaCant = Number(promo.paga_cant || 0);

					// Validación básica
					if (llevaCant > 0 && pagaCant >= 0 && llevaCant > pagaCant) 
					{
						// Cantidad de promos completas
						const combos = Math.floor(p.cantidad / llevaCant);

						// Cantidad gratis por combo
						const gratisPorCombo = llevaCant - pagaCant;

						// Total unidades gratis
						const totalGratis = combos * gratisPorCombo;

						if (totalGratis > 0) {
							const descuento = totalGratis * p.precio;
							descuentoPromos += descuento;

							promocionesAplicadas.push({
								id_promocion:promo.id_promocion,
								descripcion:promo.descripcion,
								descuento
							});
						}
					}
				}
				
				// ==================================
				// PRECIO FIJO
				// ==================================
				if (promo.tipo === 'PRECIO_FIJO') {
					const cantidadMin = Number(promo.cantidad_min || 0);
					const precioFijo = Number(promo.precio_fijo || 0);

					// Debe cumplir cantidad mínima
					if (p.cantidad >= cantidadMin && precioFijo > 0) 
					{
						const precioOriginal = Number(p.precio);

						// Solo si realmente hay descuento
						if (precioFijo < precioOriginal) {
							const descuentoUnitario = precioOriginal - precioFijo;
							const descuento = descuentoUnitario * p.cantidad;

							descuentoPromos += descuento;

							promocionesAplicadas.push({
								id_promocion:promo.id_promocion,
								descripcion:promo.descripcion,
								descuento
							});
						}
					}
				}



            }
        }

        // ==========================================

        const totalFinal = subtotalOriginal - descuentoPromos;

        res.json({
            ok: true,
            subtotalOriginal,
            descuentoPromos,
            promocionesAplicadas,
            totalFinal
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});


module.exports = router;
