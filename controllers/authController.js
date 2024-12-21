import db from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = (req, res) => {
    console.log(req.body); // Affiche le contenu de req.body pour vérifier les données
    const { Pseudo, Mail, Password, isAdmin } = req.body;

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(Password, salt);

    db.query(
        "INSERT INTO users (ID_User, Pseudo, Mail, Password, isAdmin) VALUES (UUID(), ?, ?, ?, ?)",
        [Pseudo, Mail, hashedPassword, isAdmin || 0],
        (err) => {
            if (err) {
                console.error("Erreur MySQL : ", err); // Affiche l'erreur dans la console
                return res.status(500).json({ error: `Erreur lors de l'inscription: ${err.message}` });
            }
            res.status(201).json({ message: "Utilisateur créé avec succès" });
        }
    );
};

export const login = (req, res) => {
    console.log("Requête reçue :", req.body);
    const { Mail, Password } = req.body;

    if (!Mail || !Password) {
        console.log("Champs manquants:", { Mail, Password });
        return res.status(400).json({ error: "Mail et mot de passe requis" });
    }

    // Modification de la requête pour respecter la casse
    db.query('SELECT * FROM users WHERE "Mail" = $1', [Mail], (err, results) => {
        if (err) {
            console.error("Erreur DB:", err);
            return res.status(500).json({ error: "Erreur de connexion", details: err.message });
        }
        
        if (!results.rows || results.rows.length === 0) {
            console.log("Utilisateur non trouvé pour:", Mail);
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }

        const user = results.rows[0];
        console.log("Utilisateur trouvé:", { id: user.ID_User, mail: user.Mail });

        try {
            const isPasswordValid = bcrypt.compareSync(Password, user.Password);
            console.log("Vérification mot de passe:", isPasswordValid);
            
            if (!isPasswordValid) {
                return res.status(401).json({ error: "Mot de passe incorrect" });
            }

            const token = jwt.sign({ ID_User: user.ID_User }, process.env.JWT_SECRET, { expiresIn: "1h" });
            console.log("Token généré avec succès");

            res.status(200).json({ message: "Connexion réussie", token });
        } catch (error) {
            console.error("Erreur bcrypt:", error);
            return res.status(500).json({ error: "Erreur lors de la vérification du mot de passe" });
        }
    });
};