define([
  'angular',
  'jquery',
  'config',
  'panelclipboard'
],
function (angular, $, config, panelclipboard) {
  "use strict";

  var module = angular.module('grafana.controllers');

  module.controller('DashboardCtrl', function(
      $scope,
      $rootScope,
      dashboardKeybindings,
      timeSrv,
      templateValuesSrv,
      dynamicDashboardSrv,
      dashboardSrv,
      unsavedChangesSrv,
      dashboardViewStateSrv,
      contextSrv,
      $timeout) {

    $scope.editor = { index: 0 };
    $scope.topNavPartial = 'app/features/dashboard/partials/dashboardTopNav.html';
    $scope.panels = config.panels;

    var resizeEventTimeout;

    this.init = function(dashboard) {
      $scope.reset_row();
      $scope.registerWindowResizeEvent();
      $scope.onAppEvent('show-json-editor', $scope.showJsonEditor);
      $scope.setupDashboard(dashboard);
    };

    $scope.setupDashboard = function(data) {
      $rootScope.performance.dashboardLoadStart = new Date().getTime();
      $rootScope.performance.panelsInitialized = 0;
      $rootScope.performance.panelsRendered = 0;

      var dashboard = dashboardSrv.create(data.model, data.meta);

      // init services
      timeSrv.init(dashboard);

      // template values service needs to initialize completely before
      // the rest of the dashboard can load
      templateValuesSrv.init(dashboard).finally(function() {
        dynamicDashboardSrv.init(dashboard);
        unsavedChangesSrv.init(dashboard, $scope);

        $scope.dashboard = dashboard;
        $scope.dashboardMeta = dashboard.meta;
        $scope.dashboardViewState = dashboardViewStateSrv.create($scope);

        dashboardKeybindings.shortcuts($scope);

        $scope.updateTopNavPartial();
        $scope.updateSubmenuVisibility();
        $scope.setWindowTitleAndTheme();

        $scope.appEvent("dashboard-loaded", $scope.dashboard);
      }).catch(function(err) {
        console.log('Failed to initialize dashboard template variables, error: ', err);
        $scope.appEvent("alert-error", ['Dashboard init failed', 'Template variables could not be initialized: ' + err.message]);
      });
    };

    $scope.updateTopNavPartial = function() {
      if ($scope.dashboard.meta.isSnapshot) {
        $scope.topNavPartial = 'app/features/dashboard/partials/snapshotTopNav.html';
      }
    };

    $scope.updateSubmenuVisibility = function() {
      $scope.submenuEnabled = $scope.dashboard.hasTemplateVarsOrAnnotations();
    };

    $scope.setWindowTitleAndTheme = function() {
      window.document.title = config.window_title_prefix + $scope.dashboard.title;
    };

    $scope.broadcastRefresh = function() {
      $rootScope.$broadcast('refresh');
    };

    $scope.add_row = function(dash, row) {
      dash.rows.push(row);
    };

    $scope.add_row_default = function() {
      $scope.reset_row();
      $scope.row.title = 'New row';
      $scope.add_row($scope.dashboard, $scope.row);
    };

    $scope.paste_in_new_row = function() {
      var panel = panelclipboard.get();
      if (panel != null) {
        $scope.reset_row();
        panel["span"] = 12;

        $scope.row.title = panel.title;
        $scope.row.panels = [];

        $scope.add_row($scope.dashboard, $scope.row);
        $scope.dashboard.add_panel(panel, $scope.row);
      } else {
        $scope.appEvent('alert-error', ["Clipboard error", "The clipboard doesn't contain a valid panel"]);
      }
    };

    $scope.reset_row = function() {
      $scope.row = {
        title: '',
        height: '250px',
        editable: true,
      };
    };

    $scope.panelEditorPath = function(type) {
      return 'app/' + config.panels[type].path + '/editor.html';
    };

    $scope.pulldownEditorPath = function(type) {
      return 'app/panels/'+type+'/editor.html';
    };

    $scope.showJsonEditor = function(evt, options) {
      var editScope = $rootScope.$new();
      editScope.object = options.object;
      editScope.updateHandler = options.updateHandler;
      $scope.appEvent('show-dash-editor', { src: 'app/partials/edit_json.html', scope: editScope });
    };

    $scope.onDrop = function(panelId, row, dropTarget) {
      var info = $scope.dashboard.getPanelInfoById(panelId);
      if (dropTarget) {
        var dropInfo = $scope.dashboard.getPanelInfoById(dropTarget.id);
        dropInfo.row.panels[dropInfo.index] = info.panel;
        info.row.panels[info.index] = dropTarget;
        var dragSpan = info.panel.span;
        info.panel.span = dropTarget.span;
        dropTarget.span = dragSpan;
      }
      else {
        info.row.panels.splice(info.index, 1);
        info.panel.span = 12 - $scope.dashboard.rowSpan(row);
        row.panels.push(info.panel);
      }

      $rootScope.$broadcast('render');
    };

    $scope.registerWindowResizeEvent = function() {
      angular.element(window).bind('resize', function() {
        $timeout.cancel(resizeEventTimeout);
        resizeEventTimeout = $timeout(function() { $scope.$broadcast('render'); }, 200);
      });
      $scope.$on('$destroy', function() {
        angular.element(window).unbind('resize');
      });
    };

  });

});
