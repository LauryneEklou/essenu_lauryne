import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize.js';

class Document extends Model {
    // Méthode d’instance pour mettre à jour le document
    async updateInfo(newData) {
        this.title = newData.title ?? this.title;
        this.description = newData.description ?? this.description;
        await this.save();
        return this;
    }

    // Méthode statique pour mettre à jour par ID
    static async updateDocumentById(id, data) {
        const doc = await Document.findByPk(id);
        if (!doc) throw new Error('Document introuvable');
        return await doc.update(data);
    }
}

Document.init({
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: DataTypes.TEXT,
    file_url: DataTypes.STRING,
    image: DataTypes.STRING,
    type: DataTypes.STRING,
    category_id: DataTypes.BIGINT,
    user_id: DataTypes.BIGINT,
    nb_download: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    sequelize,
    modelName: 'Document',
    tableName: 'documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default Document;
