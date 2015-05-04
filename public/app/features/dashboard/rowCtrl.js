define([
  'angular',
  'app',
  'lodash',
  'config',
  'panelclipboard'
],
function (angular, app, _, config, panelclipboard) {
  'use strict';

  var module = angular.module('grafana.controllers');

  module.controller('RowCtrl', function($scope, $rootScope, $timeout) {
    var _d = {
      title: "Row",
      height: "150px",
      collapse: false,
      editable: true,
      panels: [],
    };

    _.defaults($scope.row,_d);

    $scope.init = function() {
      $scope.editor = {index: 0};
      $scope.reset_panel();
    };

    $scope.togglePanelMenu = function(posX) {
      $scope.showPanelMenu = !$scope.showPanelMenu;
      $scope.panelMenuPos = posX;
    };

    $scope.toggle_row = function(row) {
      row.collapse = row.collapse ? false : true;
      if (!row.collapse) {
        $timeout(function() {
          $scope.$broadcast('render');
        });
      }
    };

    $scope.add_panel = function(panel) {
      $scope.dashboard.add_panel(panel, $scope.row);
    };

    $scope.delete_row = function() {
      $scope.appEvent('confirm-modal', {
        title: 'Are you sure you want to delete this row?',
        icon: 'fa-trash',
        yesText: 'delete',
        onConfirm: function() {
          $scope.dashboard.rows = _.without($scope.dashboard.rows, $scope.row);
        }
      });
    };

    $scope.move_row = function(direction) {
      var rowsList = $scope.dashboard.rows;
      var rowIndex = _.indexOf(rowsList, $scope.row);
      var newIndex = rowIndex + direction;
      if (newIndex >= 0 && newIndex <= (rowsList.length - 1)) {
        _.move(rowsList, rowIndex, rowIndex + direction);
      }
    };

    $scope.add_panel_default = function(type) {
      $scope.reset_panel(type);
      $scope.add_panel($scope.panel);

      $timeout(function() {
        $scope.$broadcast('render');
      });
    };

    $scope.paste_panel = function() {
      var panel = panelclipboard.get();
      if (panel != null) {
        $scope.reset_panel();
        panel.span = $scope.panel.span;
        $scope.add_panel(panel);

        $timeout(function() {
          $scope.$broadcast('render');
        });
      } else {
        $scope.appEvent('alert-error', ["Clipboard error", "The clipboard doesn't contain a valid panel"]);
      }
    };

    $scope.set_height = function(height) {
      $scope.row.height = height;
      $scope.$broadcast('render');
    };

    $scope.removePanel = function(panel) {
      $scope.appEvent('confirm-modal', {
        title: 'Are you sure you want to remove this panel?',
        icon: 'fa-trash',
        yesText: 'Delete',
        onConfirm: function() {
          $scope.row.panels = _.without($scope.row.panels, panel);
        }
      });
    };

    $scope.updatePanelSpan = function(panel, span) {
      panel.span = Math.min(Math.max(panel.span + span, 1), 12);
    };

    $scope.replacePanel = function(newPanel, oldPanel) {
      var row = $scope.row;
      var index = _.indexOf(row.panels, oldPanel);
      row.panels.splice(index, 1);

      // adding it back needs to be done in next digest
      $timeout(function() {
        newPanel.id = oldPanel.id;
        newPanel.span = oldPanel.span;
        row.panels.splice(index, 0, newPanel);
      });
    };

    $scope.reset_panel = function(type) {
      var defaultSpan = 12;
      var _as = 12 - $scope.dashboard.rowSpan($scope.row);

      $scope.panel = {
        title: config.new_panel_title,
        error: false,
        span: _as < defaultSpan && _as > 0 ? _as : defaultSpan,
        editable: true,
        type: type
      };

      function fixRowHeight(height) {
        if (!height) {
          return '200px';
        }
        if (!_.isString(height)) {
          return height + 'px';
        }
        return height;
      }

      $scope.row.height = fixRowHeight($scope.row.height);
    };

    $scope.init();

  });

  module.directive('rowHeight', function() {
    return function(scope, element) {
      scope.$watchGroup(['row.collapse', 'row.height'], function() {
        element[0].style.minHeight = scope.row.collapse ? '5px' : scope.row.height;
      });
    };
  });

  module.directive('panelWidth', function() {
    return function(scope, element) {
      function updateWidth() {
        element[0].style.width = ((scope.panel.span / 1.2) * 10) + '%';
      }

      scope.$watch('panel.span', updateWidth);
    };
  });

  module.directive('panelDropZone', function() {
    return function(scope, element) {
      scope.$on("ANGULAR_DRAG_START", function() {
        var dropZoneSpan = 12 - scope.dashboard.rowSpan(scope.row);

        if (dropZoneSpan > 0) {
          element.find('.panel-container').css('height', scope.row.height);
          element[0].style.width = ((dropZoneSpan / 1.2) * 10) + '%';
          element.show();
        }
      });

      scope.$on("ANGULAR_DRAG_END", function() {
        element.hide();
      });
    };
  });

});
