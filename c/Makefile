dir = $(1)$(shell mkdir -p $(1))

INC = $(call dir,inc/)
SRC = $(call dir,src/)
DEP = $(call dir,dep/)
OBJ = $(call dir,obj/)
BIN = $(call dir,bin/)

BUILD = $(call dir,build/)
TEST = $(call dir,test/)

OBJS = $(patsubst $(SRC)%.cpp,$(OBJ)%.o,$(wildcard $(SRC)*.cpp))

CC = g++
CFLAGS = -I$(INC) -std=c++17 -fmax-errors=1 -ftemplate-depth=32 -g -DDEBUG=1

$(OBJ)%.o: $(SRC)%.cpp $(DEP)%.d
	$(CC) $(CFLAGS) -c $< -o $@

$(INC)%.hpp: ;
	echo building header
$(INC)%.hpp: $(OBJ)%.o
	echo building header

$(DEP)%.d: $(SRC)%.cpp
	$(CC) $(CFLAGS) -MM -MP -MF $@ -MT $(patsubst $(DEP)%.d,$(OBJ)%.o,$@) $<

$(BIN)%: $(OBJ)%.o
	$(CC) $(CFLAGS) $(patsubst $(BIN)%,$(BUILD)%.cpp,$@) $(OBJS) -o $@

$(TEST)%: $(BUILD)%.cpp $(OBJS)
	$(CC) $(CFLAGS) $^ -o $@
	
-include $(patsubst $(OBJ)%.o,$(DEP)%.d,$(OBJS))

Makefile:
	make clean
%: Makefile

clean:
	rm -f $(DEP)* $(OBJ)* $(BIN)* $(TEST)*

.PHONY: clean
