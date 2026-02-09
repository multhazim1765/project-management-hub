const PDFDocument = require('pdfkit');
const { format } = require('date-fns');

class PDFGenerator {
  /**
   * Generate project progress report PDF
   */
  generateProjectProgressPDF(reportData, stream) {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(stream);

    // Header
    this.addHeader(doc, 'Project Progress Report');
    this.addSubHeader(doc, reportData.project.name);

    // Project info
    doc
      .fontSize(10)
      .text(`Status: ${reportData.project.status}`, { continued: true })
      .text(`  |  Members: ${reportData.project.memberCount}`, { align: 'left' });

    if (reportData.project.startDate) {
      doc.text(
        `Start Date: ${format(new Date(reportData.project.startDate), 'MMM dd, yyyy')}`,
        { continued: true }
      );
      if (reportData.project.endDate) {
        doc.text(
          `  |  End Date: ${format(new Date(reportData.project.endDate), 'MMM dd, yyyy')}`
        );
      } else {
        doc.text('');
      }
    }

    doc.moveDown(1.5);

    // Summary section
    this.addSection(doc, 'Summary');

    const summary = [
      ['Total Tasks', reportData.summary.totalTasks],
      ['Completed Tasks', reportData.summary.completedTasks],
      ['Progress', `${reportData.summary.progressPercentage}%`],
      ['Estimated Hours', reportData.summary.totalEstimatedHours.toFixed(1)],
      ['Actual Hours', reportData.summary.totalActualHours.toFixed(1)],
      ['Schedule Status', reportData.summary.scheduleStatus],
    ];

    this.addKeyValueTable(doc, summary);
    doc.moveDown();

    // Tasks by status
    this.addSection(doc, 'Tasks by Status');

    const statusHeaders = ['Status', 'Count', 'Est. Hours', 'Actual Hours'];
    const statusRows = reportData.tasksByStatus.map((stat) => [
      stat.status,
      stat.count.toString(),
      stat.estimatedHours.toFixed(1),
      stat.actualHours.toFixed(1),
    ]);

    this.addTable(doc, statusHeaders, statusRows);
    doc.moveDown();

    // Time tracking
    if (reportData.timeTracking) {
      this.addSection(doc, 'Time Tracking');

      const timeData = [
        ['Total Hours', reportData.timeTracking.totalHours.toFixed(1)],
        ['Billable Hours', reportData.timeTracking.billableHours.toFixed(1)],
        ['Total Amount', `$${reportData.timeTracking.totalAmount.toFixed(2)}`],
      ];

      this.addKeyValueTable(doc, timeData);
      doc.moveDown();
    }

    // Top contributors
    if (reportData.topContributors && reportData.topContributors.length > 0) {
      this.addSection(doc, 'Top Contributors');

      const contributorHeaders = ['Name', 'Total Hours', 'Billable Hours'];
      const contributorRows = reportData.topContributors.map((contrib) => [
        `${contrib.user.firstName} ${contrib.user.lastName}`,
        contrib.totalHours.toFixed(1),
        contrib.billableHours.toFixed(1),
      ]);

      this.addTable(doc, contributorHeaders, contributorRows);
    }

    // Footer
    this.addFooter(
      doc,
      `Generated on ${format(new Date(reportData.generatedAt), 'MMM dd, yyyy HH:mm')}`
    );

    doc.end();
    return doc;
  }

  /**
   * Generate time utilization report PDF
   */
  generateTimeUtilizationPDF(reportData, stream) {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(stream);

    // Header
    this.addHeader(doc, 'Time Utilization Report');

    if (reportData.filters.startDate && reportData.filters.endDate) {
      this.addSubHeader(
        doc,
        `${format(new Date(reportData.filters.startDate), 'MMM dd, yyyy')} - ${format(
          new Date(reportData.filters.endDate),
          'MMM dd, yyyy'
        )}`
      );
    }

    doc.moveDown();

    // Summary
    this.addSection(doc, 'Summary');

    const summary = [
      ['Total Hours', reportData.summary.totalHours.toFixed(1)],
      ['Billable Hours', reportData.summary.billableHours.toFixed(1)],
      ['Total Amount', `$${reportData.summary.totalAmount.toFixed(2)}`],
      ['Time Entries', reportData.summary.entryCount.toString()],
    ];

    this.addKeyValueTable(doc, summary);
    doc.moveDown();

    // By project
    if (reportData.byProject && reportData.byProject.length > 0) {
      this.addSection(doc, 'Hours by Project');

      const projectHeaders = ['Project', 'Total Hours', 'Billable Hours'];
      const projectRows = reportData.byProject.slice(0, 10).map((proj) => [
        proj.project.name,
        proj.totalHours.toFixed(1),
        proj.billableHours.toFixed(1),
      ]);

      this.addTable(doc, projectHeaders, projectRows);
      doc.moveDown();
    }

    // By user
    if (reportData.byUser && reportData.byUser.length > 0) {
      this.addSection(doc, 'Hours by User');

      const userHeaders = ['User', 'Total Hours', 'Billable Hours'];
      const userRows = reportData.byUser.slice(0, 10).map((user) => [
        `${user.user.firstName} ${user.user.lastName}`,
        user.totalHours.toFixed(1),
        user.billableHours.toFixed(1),
      ]);

      this.addTable(doc, userHeaders, userRows);
    }

    // Footer
    this.addFooter(
      doc,
      `Generated on ${format(new Date(reportData.generatedAt), 'MMM dd, yyyy HH:mm')}`
    );

    doc.end();
    return doc;
  }

  /**
   * Generate task metrics report PDF
   */
  generateTaskMetricsPDF(reportData, stream) {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(stream);

    // Header
    this.addHeader(doc, 'Task Metrics Report');

    if (reportData.filters.startDate && reportData.filters.endDate) {
      this.addSubHeader(
        doc,
        `${format(new Date(reportData.filters.startDate), 'MMM dd, yyyy')} - ${format(
          new Date(reportData.filters.endDate),
          'MMM dd, yyyy'
        )}`
      );
    }

    doc.moveDown();

    // Summary
    this.addSection(doc, 'Summary');

    const summary = [
      ['Total Tasks', reportData.summary.totalTasks.toString()],
      ['Completed Tasks', reportData.summary.completedTasks.toString()],
      ['Overdue Tasks', reportData.summary.overdueTasks.toString()],
      [
        'Avg Completion Time',
        `${reportData.summary.avgCompletionTimeDays.toFixed(1)} days`,
      ],
    ];

    this.addKeyValueTable(doc, summary);
    doc.moveDown();

    // By priority
    if (reportData.byPriority && reportData.byPriority.length > 0) {
      this.addSection(doc, 'Tasks by Priority');

      const priorityHeaders = ['Priority', 'Total', 'Completed', 'Avg Est. Hrs'];
      const priorityRows = reportData.byPriority.map((stat) => [
        stat._id,
        stat.count.toString(),
        stat.completed.toString(),
        (stat.avgEstimatedHours || 0).toFixed(1),
      ]);

      this.addTable(doc, priorityHeaders, priorityRows);
      doc.moveDown();
    }

    // By status
    if (reportData.byStatus && reportData.byStatus.length > 0) {
      this.addSection(doc, 'Tasks by Status');

      const statusHeaders = ['Status', 'Count', 'Est. Hours', 'Actual Hours'];
      const statusRows = reportData.byStatus.map((stat) => [
        stat._id,
        stat.count.toString(),
        (stat.totalEstimatedHours || 0).toFixed(1),
        (stat.totalActualHours || 0).toFixed(1),
      ]);

      this.addTable(doc, statusHeaders, statusRows);
    }

    // Footer
    this.addFooter(
      doc,
      `Generated on ${format(new Date(reportData.generatedAt), 'MMM dd, yyyy HH:mm')}`
    );

    doc.end();
    return doc;
  }

  // ============ Helper Methods ============

  addHeader(doc, title) {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(title, { align: 'center' })
      .moveDown(0.5);
  }

  addSubHeader(doc, text) {
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#666')
      .text(text, { align: 'center' })
      .fillColor('#000')
      .moveDown(1);
  }

  addSection(doc, title) {
    doc.fontSize(14).font('Helvetica-Bold').text(title).moveDown(0.5);
  }

  addKeyValueTable(doc, data) {
    const startY = doc.y;
    const leftX = 100;
    const rightX = 350;

    doc.fontSize(10).font('Helvetica');

    data.forEach((row, index) => {
      const y = startY + index * 20;
      doc.font('Helvetica-Bold').text(row[0], leftX, y, { width: 200 });
      doc.font('Helvetica').text(row[1], rightX, y, { width: 200 });
    });

    doc.moveDown(data.length * 0.3);
  }

  addTable(doc, headers, rows) {
    const startY = doc.y;
    const columnWidth = (doc.page.width - 100) / headers.length;
    let currentY = startY;

    // Headers
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, 50 + i * columnWidth, currentY, {
        width: columnWidth - 10,
        align: 'left',
      });
    });

    currentY += 20;

    // Draw line under headers
    doc
      .moveTo(50, currentY - 5)
      .lineTo(doc.page.width - 50, currentY - 5)
      .stroke();

    // Rows
    doc.font('Helvetica');
    rows.forEach((row) => {
      row.forEach((cell, i) => {
        doc.text(cell, 50 + i * columnWidth, currentY, {
          width: columnWidth - 10,
          align: 'left',
        });
      });
      currentY += 18;

      // Add page break if needed
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
      }
    });

    doc.y = currentY + 10;
  }

  addFooter(doc, text) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .fillColor('#999')
        .text(text, 50, doc.page.height - 50, {
          align: 'center',
        })
        .fillColor('#000');
    }
  }
}

module.exports = new PDFGenerator();
