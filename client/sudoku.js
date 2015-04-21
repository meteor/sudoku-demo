// Input a pretty hard Sudoku from here:
// http://www.menneske.no/sudoku/eng/showpuzzle.html?number=6903541
Session.setDefault('puzzle', [
  "....839..",
  "1......3.",
  "..4....7.",
  ".42.3....",
  "6.......4",
  "....7..1.",
  ".2.......",
  ".8...92..",
  "...25...6"
]);

Session.setDefault('solution', null);

Template.body.helpers({
  puzzle: function () {
    return _.map(Session.get('solution'), function (row, r) {
      return _.map(row, function (cell, c) {
        return _.extend({r:r, c:c}, cell);
      });
    });
  },
  cellType: function () {
    if (this.given) {
      return 'given';
    } else if (! this.allowed) {
      return 'bad';
    } else if (this.allowed.length === 1) {
      return 'unique';
    } else {
      return 'multiple';
    }
  },
  cellContent: function () {
    return this.given || this.allowed.split('').join(' ');
  }
});

Template.body.events({
  'mousedown .cell': function (event) {
    var puzzle = Session.get('puzzle');
    var row = puzzle[this.r].split('');
    var oldValue = row[this.c];
    if (event.shiftKey) {
      row[this.c] = '.';
    } else if (oldValue >= "1" && oldValue <= "8") {
      row[this.c] = String(Number(oldValue)+1);
    } else if (oldValue === "9") {
      row[this.c] = '.';
    } else {
      row[this.c] = "1";
    }
    puzzle[this.r] = row.join('');
    Session.set('puzzle', puzzle);

    event.preventDefault(); // don't select text
  }
});

Meteor.startup(function () {
  Tracker.autorun(function () {
    var puzzle = Session.get('puzzle');

    var v = function (row, col, value) {
      return row + "," + col + "=" + value;
    };

    Logic._disablingTypeChecks(function () {
      var T = +new Date;
      var solver = new Logic.Solver();

      // All rows, columns, and digits are 0-based internally.
      for (var x = 0; x < 9; x++) {
        // Find the top-left of box x. For example, Box 0 has a top-left
        // of (0,0).  Box 3 has a top-left of (3,0).
        var boxRow = Math.floor(x/3)*3;
        var boxCol = (x%3)*3;
        for (var y = 0; y < 9; y++) {
          var numberInEachSquare = [];
          var columnHavingYInRowX = [];
          var rowHavingYInColumnX = [];
          var squareHavingYInBoxX = [];
          for (var z = 0; z < 9; z++) {
            numberInEachSquare.push(v(x,y,z));
            columnHavingYInRowX.push(v(x,z,y));
            rowHavingYInColumnX.push(v(z,x,y));
            squareHavingYInBoxX.push(v(
              boxRow + Math.floor(z/3),
              boxCol + (z%3),
              y));
          }
          solver.require(Logic.exactlyOne(numberInEachSquare));
          solver.require(Logic.exactlyOne(columnHavingYInRowX));
          solver.require(Logic.exactlyOne(rowHavingYInColumnX));
          solver.require(Logic.exactlyOne(squareHavingYInBoxX));
        }
      }

      for (var r = 0; r < 9; r++) {
        var str = puzzle[r];
        for (var c = 0; c < 9; c++) {
          // zero-based digit
          var digit = str.charCodeAt(c) - 49;
          if (digit >= 0 && digit < 9) {
            solver.require(v(r, c, digit));
          }
        }
      }

      solver.solve();
      //console.log("Solved in " + ((new Date) - T) + " ms");

      var solution = [];
      for (var r = 0; r < 9; r++) {
        var row = [];
        solution.push(row);
        var str = puzzle[r];
        for (var c = 0; c < 9; c++) {
          var chr = str.charAt(c);
          if (chr >= "1" && chr <= "9") {
            row.push({given: chr});
          } else {
            var nums = "";
            for (var d = 0; d < 9; d++) {
              var x = v(r, c, d);
              if (solver.solveAssuming(x)) {
                nums += String(d+1);
              } else {
                solver.forbid(x);
              }
            }
            row.push({allowed: nums});
          }
        }
      }

      Session.set('solution', solution);
    });
  });
});
