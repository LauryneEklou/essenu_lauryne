import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const NewsView = sequelize.define('news_view', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  news_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false
  },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'news_views'
});

export default NewsView;
