const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/:tipo', async(req,res)=>{

    try{

        const [rows] =
            await db.query(`
                SELECT *
                FROM horarios
                WHERE tipo = ?
                ORDER BY dia,desde
            `,
            [req.params.tipo]);

        res.json({
            ok:true,
            horarios:rows
        });

    }catch(err){

        console.error(err);

        res.status(500).json({
            ok:false
        });
    }
});

router.post('/:tipo', async(req,res)=>{

    const conn =
        await db.getConnection();

    try{

        const tipo =
            req.params.tipo;

        const horarios =
            req.body.horarios || [];

        await conn.beginTransaction();

        await conn.query(`
            DELETE FROM horarios
            WHERE tipo = ?
        `,[tipo]);

        for(const h of horarios){

            await conn.query(`
                INSERT INTO horarios
                (
                    tipo,
                    dia,
                    desde,
                    hasta
                )
                VALUES
                (
                    ?,?,?,?
                )
            `,
            [
                tipo,
                h.dia,
                h.desde,
                h.hasta
            ]);
        }

        await conn.commit();

        res.json({
            ok:true
        });

    }catch(err){

        await conn.rollback();

        console.error(err);

        res.status(500).json({
            ok:false
        });

    }finally{

        conn.release();

    }
});


module.exports = router;
