'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Resumes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      originalFileName: {
        type: Sequelize.STRING
      },
      s3Key: {
        type: Sequelize.STRING
      },
      s3Url: {
        type: Sequelize.STRING
      },
      markdownContent: {
        type: Sequelize.TEXT
      },
      fileType: {
        type: Sequelize.ENUM('pdf', 'doc', 'docx'),
        allowNull: false
      },
      fileSize: {
        type: Sequelize.INTEGER,
        comment: 'File size in bytes'
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      lastModified: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.dropTable('Resumes');
  }
};