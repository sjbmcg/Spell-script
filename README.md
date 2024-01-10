# Endless Script Lab

This project was created for my 2022 coursework on language design.

It is a small browser-based scripting tool that lets you type either:

- plain expressions like `1+1`
- simple Endless Online-inspired function code

## What It Does

The app has two main parts:

- a code box where you type expressions or script code
- a function map that shows how `spell` and `warp` connect functions together

If you type a plain expression, the app evaluates it and shows the result.

If you type script code, the app:

- runs the `hero` spell first
- lets `warp` call other spells
- prints `say` output
- returns a final value with `loot`

## Language Basics

The basic Endless-style keywords are:

- `hero` sets the first spell to run
- `spell` defines a function
- `stash` stores a variable
- `say` prints output
- `warp` calls another spell
- `ifso` starts a conditional block
- `otherwise` is the false branch
- `loot` returns a value
- `end` closes a block

Boolean values use:

- `ember` for true
- `frost` for false

## Quick Examples

### Plain expression

```txt
1+1
```

Result:

```txt
2
```

### Basic script

```txt
hero main

spell main
  stash gold = 72
  ifso gold >= 50
    say "Enough gold for new gear."
  otherwise
    say "Need more gold."
  end
  loot gold
end
```

## How To Use It

1. Open `index.html` in a browser.
2. Type either an expression or a script into the editor.
3. Watch the result and output update.
4. If you used `spell` and `warp`, check the function map to see the structure.
