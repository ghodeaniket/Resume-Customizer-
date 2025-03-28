'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Resumes', 'customizationStatus', {
      type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending',
      allowNull: false
    });

    await queryInterface.addColumn('Resumes', 'customizedContent', {
      type: Sequelize.TEXT
    });

    await queryInterface.addColumn('Resumes', 'customizationError', {
      type: Sequelize.TEXT
    });

    await queryInterface.addColumn('Resumes', 'customizationCompletedAt', {
      type: Sequelize.DATE
    });

    await queryInterface.addColumn('Resumes', 'customizedS3Key', {
      type: Sequelize.STRING
    });

    await queryInterface.addColumn('Resumes', 'customizedS3Url', {
      type: Sequelize.STRING
    });

    await queryInterface.addColumn('Resumes', 'jobTitle', {
      type: Sequelize.STRING
    });

    await queryInterface.addColumn('Resumes', 'companyName', {
      type: Sequelize.STRING
    });

    await queryInterface.addColumn('Resumes', 'jobDescription', {
      type: Sequelize.TEXT
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Resumes', 'customizationStatus');
    await queryInterface.removeColumn('Resumes', 'customizedContent');
    await queryInterface.removeColumn('Resumes', 'customizationError');
    await queryInterface.removeColumn('Resumes', 'customizationCompletedAt');
    await queryInterface.removeColumn('Resumes', 'customizedS3Key');
    await queryInterface.removeColumn('Resumes', 'customizedS3Url');
    await queryInterface.removeColumn('Resumes', 'jobTitle');
    await queryInterface.removeColumn('Resumes', 'companyName');
    await queryInterface.removeColumn('Resumes', 'jobDescription');
  }
};